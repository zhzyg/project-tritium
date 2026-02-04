<template>
  <PageWrapper title="表单设计器（VForm）" contentFullHeight>
    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="form" tab="表单设计">
        <div class="vform-designer-page">
          <div class="vform-designer-toolbar">
            <a-space>
              <a-button type="primary" @click="handleSave">Save</a-button>
              <a-button @click="handlePublish">Publish</a-button>
              <a-button @click="handleLoad">Load</a-button>
              <a-button danger @click="handleReset">Reset</a-button>
            </a-space>
            <a-space class="vform-designer-meta" size="large">
              <span>formKey: {{ formKey }}</span>
              <span>version: {{ latestVersion ?? '-' }}</span>
              <span>table: {{ lastPublishTable || '-' }}</span>
              <span>last saved: {{ lastSavedTime || '-' }}</span>
            </a-space>
          </div>
          <div class="vform-designer-body">
            <VFormDesigner ref="designerRef" />
          </div>
        </div>
      </a-tab-pane>
      <a-tab-pane key="process" force-render>
        <template #tab>
          <span data-testid="tab-process-designer">流程设计</span>
        </template>
        <FormProcessDesigner :form-key="formKey" />
      </a-tab-pane>
    </a-tabs>
  </PageWrapper>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref, watch } from 'vue';
  import { useRoute } from 'vue-router';
  import { message } from 'ant-design-vue';
  import { PageWrapper } from '/@/components/Page';
  import { VFormDesigner } from 'vform3-builds';
  import FormProcessDesigner from './_components/FormProcessDesigner.vue';
  import { getLatestSchema, saveSchema, publishSchema } from './designer.api';
  import 'vform3-builds/dist/designer.style.css';

  const TRITIUM_FORM_KEY_DEV = 'dev';
  const route = useRoute();
  const resolveTab = (value?: string) => (value === 'process' ? 'process' : 'form');
  const activeTab = ref(resolveTab(route.query.tab as string));
  const designerRef = ref<any>(null);
  const formKey = computed(() => (route.query.formKey as string) || (route.params.formKey as string) || TRITIUM_FORM_KEY_DEV);
  const storageKey = computed(() => `TRITIUM_VFORM_SCHEMA_${formKey.value}`);
  const latestVersion = ref<number | null>(null);
  const lastSavedTime = ref<string | null>(null);
  const lastPublishTable = ref<string | null>(null);

  const getDesignerApi = () => designerRef.value;

  const extractSchema = (api: any) => {
    if (api?.getFormJson) return api.getFormJson();
    if (api?.getFormConfig) return api.getFormConfig();
    return null;
  };

  const applySchema = (api: any, schema: Record<string, any>) => {
    if (api?.setFormJson) {
      api.setFormJson(schema);
      return true;
    }
    if (api?.setFormConfig) {
      api.setFormConfig(schema);
      return true;
    }
    return false;
  };

  const handleSave = async () => {
    const api = getDesignerApi();
    const schema = extractSchema(api);
    if (!schema) {
      message.error('Designer API not ready');
      return;
    }
    const schemaJson = JSON.stringify(schema);
    try {
      const res = await saveSchema({ formKey: formKey.value, schemaJson });
      latestVersion.value = res?.version ?? latestVersion.value;
      lastSavedTime.value = res?.savedTime ?? lastSavedTime.value;
      localStorage.setItem(storageKey.value, schemaJson);
      message.success('Schema saved');
    } catch (err) {
      localStorage.setItem(storageKey.value, schemaJson);
      message.warning('Backend save failed, saved locally');
    }
  };

  const loadFromLocal = (silent = false) => {
    const raw = localStorage.getItem(storageKey.value);
    if (!raw) {
      if (!silent) message.warning('No schema saved');
      return;
    }
    let parsed: Record<string, any> | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      if (!silent) message.error('Schema JSON invalid');
      return;
    }
    const api = getDesignerApi();
    if (!applySchema(api, parsed)) {
      if (!silent) message.error('Designer API not ready');
      return;
    }
    if (!silent) message.success('Schema loaded');
  };

  const loadFromBackend = async (silent = false) => {
    const res = await getLatestSchema({ formKey: formKey.value });
    if (!res?.schemaJson) {
      if (!silent) message.warning('No schema returned');
      return;
    }
    let parsed: Record<string, any> | null = null;
    try {
      parsed = JSON.parse(res.schemaJson);
    } catch (err) {
      if (!silent) message.error('Schema JSON invalid');
      return;
    }
    const api = getDesignerApi();
    if (!applySchema(api, parsed)) {
      if (!silent) message.error('Designer API not ready');
      return;
    }
    latestVersion.value = res?.version ?? latestVersion.value;
    lastSavedTime.value = res?.savedTime ?? lastSavedTime.value;
    localStorage.setItem(storageKey.value, res.schemaJson);
    if (!silent) message.success('Schema loaded');
  };

  const handleLoad = async (silent = false) => {
    try {
      await loadFromBackend(silent);
      return;
    } catch (err) {
      if (!silent) message.warning('Backend load failed, using local storage');
    }
    loadFromLocal(silent);
  };

  const handlePublish = async () => {
    try {
      const resp = await publishSchema({ formKey: formKey.value });
      latestVersion.value = resp?.version ?? latestVersion.value;
      lastPublishTable.value = resp?.tableName ?? lastPublishTable.value;
      const ddlCount = resp?.ddlApplied?.length ?? 0;
      message.success(`Published to ${resp?.tableName || 'table'} (ddl: ${ddlCount})`);
    } catch (err) {
      message.error('Publish failed');
    }
  };

  const handleReset = () => {
    localStorage.removeItem(storageKey.value);
    const api = getDesignerApi();
    if (api?.setFormJson) {
      api.setFormJson({ widgetList: [], formConfig: {} });
    }
    message.success('Schema reset');
  };

  const resetMeta = () => {
    latestVersion.value = null;
    lastSavedTime.value = null;
    lastPublishTable.value = null;
  };

  onMounted(() => {
    handleLoad(true);
  });

  watch(formKey, () => {
    resetMeta();
    handleLoad(true);
  });

  watch(
    () => route.query.tab,
    (tab) => {
      activeTab.value = resolveTab(tab as string);
    }
  );
</script>

<style scoped>
  .vform-designer-page {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .vform-designer-toolbar {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }

  .vform-designer-meta {
    color: #6b7280;
    font-size: 12px;
  }

  .vform-designer-body {
    flex: 1;
    min-height: 0;
  }

  .vform-designer-body :deep(.main-container) {
    height: 100%;
  }

  :deep(.ant-tabs) {
    height: 100%;
  }

  :deep(.ant-tabs-content-holder) {
    height: 100%;
  }
</style>
