<template>
  <PageWrapper title="表单设计器" contentFullHeight>
    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="form" tab="表单设计">
        <div class="vform-designer-page">
          <div class="vform-designer-toolbar">
            <a-space>
              <a-button type="primary" @click="handleSave">保存</a-button>
              <a-button @click="handlePublish">发布</a-button>
              <a-button @click="handleLoad">加载</a-button>
              <a-button danger @click="handleReset">重置</a-button>
            </a-space>
            <a-space class="vform-designer-meta" size="large">
              <span>表单Key: {{ formKey }}</span>
              <span>版本: {{ latestVersion ?? '-' }}</span>
              <span>数据表: {{ lastPublishTable || '-' }}</span>
              <span>最近保存: {{ lastSavedTime || '-' }}</span>
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
      message.error('设计器未就绪');
      return;
    }
    const schemaJson = JSON.stringify(schema);
    try {
      const res = await saveSchema({ formKey: formKey.value, schemaJson });
      latestVersion.value = res?.version ?? latestVersion.value;
      lastSavedTime.value = res?.savedTime ?? lastSavedTime.value;
      localStorage.setItem(storageKey.value, schemaJson);
      message.success('表单已保存');
    } catch (err) {
      localStorage.setItem(storageKey.value, schemaJson);
      message.warning('后端保存失败，已保存到本地');
    }
  };

  const loadFromLocal = (silent = false) => {
    const raw = localStorage.getItem(storageKey.value);
    if (!raw) {
      if (!silent) message.warning('本地暂无表单数据');
      return;
    }
    let parsed: Record<string, any> | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      if (!silent) message.error('表单数据格式异常');
      return;
    }
    const api = getDesignerApi();
    if (!applySchema(api, parsed)) {
      if (!silent) message.error('设计器未就绪');
      return;
    }
    if (!silent) message.success('表单已加载');
  };

  const loadFromBackend = async (silent = false) => {
    const res = await getLatestSchema({ formKey: formKey.value });
    if (!res?.schemaJson) {
      if (!silent) message.warning('未获取到表单数据');
      return;
    }
    let parsed: Record<string, any> | null = null;
    try {
      parsed = JSON.parse(res.schemaJson);
    } catch (err) {
      if (!silent) message.error('表单数据格式异常');
      return;
    }
    const api = getDesignerApi();
    if (!applySchema(api, parsed)) {
      if (!silent) message.error('设计器未就绪');
      return;
    }
    latestVersion.value = res?.version ?? latestVersion.value;
    lastSavedTime.value = res?.savedTime ?? lastSavedTime.value;
    localStorage.setItem(storageKey.value, res.schemaJson);
    if (!silent) message.success('表单已加载');
  };

  const handleLoad = async (silent = false) => {
    try {
      await loadFromBackend(silent);
      return;
    } catch (err) {
      if (!silent) message.warning('后端加载失败，改用本地数据');
    }
    loadFromLocal(silent);
  };

  const handlePublish = async () => {
    try {
      const resp = await publishSchema({ formKey: formKey.value });
      latestVersion.value = resp?.version ?? latestVersion.value;
      lastPublishTable.value = resp?.tableName ?? lastPublishTable.value;
      const ddlCount = resp?.ddlApplied?.length ?? 0;
      message.success(`发布成功：${resp?.tableName || '数据表'}（DDL: ${ddlCount}）`);
    } catch (err) {
      message.error('发布失败');
    }
  };

  const handleReset = () => {
    localStorage.removeItem(storageKey.value);
    const api = getDesignerApi();
    if (api?.setFormJson) {
      api.setFormJson({ widgetList: [], formConfig: {} });
    }
    message.success('表单已重置');
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
