<template>
  <PageWrapper title="表单运行态（VForm）" contentFullHeight>
    <div class="vform-runtime-page">
      <div class="vform-runtime-toolbar">
        <a-space>
          <a-button type="primary" :loading="submitting" @click="handleSubmit">Submit</a-button>
          <a-button @click="fetchRecords">Refresh</a-button>
        </a-space>
        <a-space class="vform-runtime-meta" size="large">
          <span>formKey: {{ formKey }}</span>
          <span>schema version: {{ schemaVersion ?? '-' }}</span>
          <span>schema saved: {{ schemaSavedTime || '-' }}</span>
        </a-space>
      </div>

      <div class="vform-runtime-filters">
        <a-space>
          <a-input
            v-model:value="filterValue"
            :placeholder="`Search ${filterLabel}`"
            allow-clear
            style="min-width: 220px"
            @pressEnter="fetchRecords"
          />
          <a-button @click="fetchRecords">Search</a-button>
        </a-space>
        <span class="vform-runtime-filter-meta">field: {{ filterFieldKey }}</span>
      </div>

      <div class="vform-runtime-body">
        <VFormRender ref="renderRef" :form-json="formJson" :form-data="formData" :option-data="optionData" />
      </div>

      <div class="vform-runtime-records">
        <a-table
          :columns="columns"
          :data-source="records"
          :pagination="pagination"
          row-key="id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'dataJson'">
              <a-typography-paragraph :ellipsis="{ rows: 2 }" :content="record.dataJson" />
            </template>
            <template v-else-if="column.key === 'field'">
              <span>{{ record?.data?.[filterFieldKey] ?? '-' }}</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button size="small" @click="openJson(record)">View</a-button>
            </template>
          </template>
        </a-table>
      </div>

      <a-modal v-model:open="jsonModalOpen" title="Record JSON" width="720px" :footer="null">
        <pre class="json-preview">{{ selectedJson }}</pre>
      </a-modal>
    </div>
  </PageWrapper>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import { message } from 'ant-design-vue';
  import { PageWrapper } from '/@/components/Page';
  import { VFormRender } from 'vform3-builds';
  import 'vform3-builds/dist/render.style.css';
  import { getLatestSchema, getLatestPublishedSchema, submitRecord, pageRecords } from './runtime.api';

  const TRITIUM_FORM_KEY_DEV = 'dev';
  const formKey = TRITIUM_FORM_KEY_DEV;
  const renderRef = ref<any>(null);
  const formJson = ref<Record<string, any>>({ widgetList: [], formConfig: {} });
  const formData = reactive<Record<string, any>>({});
  const optionData = reactive<Record<string, any>>({});

  const schemaVersion = ref<number | null>(null);
  const schemaSavedTime = ref<string | null>(null);
  const publishedTable = ref<string | null>(null);
  const filterFieldKey = ref('name');
  const filterLabel = ref('name');
  const filterValue = ref('');

  const submitting = ref(false);
  const records = ref<any[]>([]);
  const pagination = reactive({ current: 1, pageSize: 10, total: 0, showSizeChanger: true });

  const jsonModalOpen = ref(false);
  const selectedJson = ref('');

  const columns = computed(() => [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 180, ellipsis: true },
    { title: 'Schema Version', dataIndex: 'schemaVersion', key: 'schemaVersion', width: 130 },
    { title: filterLabel.value || 'Field', dataIndex: 'data', key: 'field', width: 140 },
    { title: 'Created By', dataIndex: 'createdBy', key: 'createdBy', width: 120 },
    { title: 'Created Time', dataIndex: 'createdTime', key: 'createdTime', width: 180 },
    { title: 'Data JSON', dataIndex: 'dataJson', key: 'dataJson' },
    { title: 'Actions', key: 'actions', width: 90 },
  ]);

  const loadSchema = async () => {
    const res = await getLatestSchema({ formKey });
    if (!res?.schemaJson) {
      message.warning('No schema found');
      return;
    }
    try {
      const parsed = JSON.parse(res.schemaJson);
      formJson.value = parsed;
      if (renderRef.value?.setFormJson) {
        renderRef.value.setFormJson(parsed);
      }
    } catch (err) {
      message.error('Schema JSON invalid');
      return;
    }
    schemaVersion.value = res?.version ?? null;
    schemaSavedTime.value = res?.savedTime ?? null;
  };

  const fetchRecords = async () => {
    const params: Record<string, any> = {
      formKey,
      pageNo: pagination.current,
      pageSize: pagination.pageSize,
    };
    if (filterValue.value) {
      params[`q_${filterFieldKey.value}`] = filterValue.value;
    }
    const res: any = await pageRecords(params);
    records.value = res?.records ?? [];
    pagination.total = res?.total ?? 0;
  };

  const handleSubmit = async () => {
    const api = renderRef.value;
    if (!api?.getFormData) {
      message.error('Renderer not ready');
      return;
    }
    submitting.value = true;
    try {
      const data = await api.getFormData();
      const dataJson = JSON.stringify(data || {});
      const res = await submitRecord({ formKey, dataJson });
      message.success(`Saved ${res?.recordId || ''}`.trim());
      await fetchRecords();
    } catch (err: any) {
      message.error(err?.message || 'Submit failed');
    } finally {
      submitting.value = false;
    }
  };

  const openJson = (record: any) => {
    selectedJson.value = record?.dataJson || '';
    jsonModalOpen.value = true;
  };

  const loadPublishedMeta = async () => {
    try {
      const res = await getLatestPublishedSchema({ formKey });
      if (!res) return;
      publishedTable.value = res.tableName ?? null;
      const metas = res.fieldMetas ?? [];
      const stringMeta = metas.find((meta) => {
        const type = (meta.dbType || '').toLowerCase();
        return type.includes('char') || type.includes('text');
      });
      const firstMeta = stringMeta || metas[0];
      if (firstMeta?.fieldKey) {
        filterFieldKey.value = firstMeta.fieldKey;
        filterLabel.value = firstMeta.label || firstMeta.fieldKey;
      }
    } catch (err) {
      // ignore if no published schema yet
    }
  };

  onMounted(async () => {
    await loadSchema();
    await loadPublishedMeta();
    await fetchRecords();
  });
</script>

<style scoped>
  .vform-runtime-page {
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 100%;
  }

  .vform-runtime-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }

  .vform-runtime-meta {
    color: #6b7280;
    font-size: 12px;
  }

  .vform-runtime-body {
    flex: 1;
    min-height: 0;
    padding: 12px;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
  }

  .vform-runtime-filters {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .vform-runtime-filter-meta {
    color: #9ca3af;
    font-size: 12px;
  }

  .vform-runtime-records {
    border-top: 1px solid #f0f0f0;
    padding-top: 12px;
  }

  .json-preview {
    white-space: pre-wrap;
    word-break: break-word;
    background: #f7f7f7;
    padding: 12px;
    border-radius: 6px;
  }
</style>
