<template>
  <PageWrapper title="表单设计器" contentFullHeight>
    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="form" tab="表单设计">
        <div class="vform-designer-page" data-testid="form-designer-root">
          <div class="vform-designer-toolbar">
            <a-space>
              <a-button type="primary" @click="handleSave" data-testid="btn-form-save">保存</a-button>
              <a-button @click="handlePublish">发布</a-button>
              <a-button @click="handleLoad">加载</a-button>
              <a-button danger @click="handleReset">重置</a-button>
            </a-space>
            <a-space class="vform-designer-name">
              <span>表单名称:</span>
              <a-input
                v-model:value="formName"
                placeholder="请输入表单名称"
                data-testid="form-name-input"
                style="width: 220px"
              />
            </a-space>
            <a-space class="vform-designer-meta" size="large">
              <span>表单Key: {{ formKey || '未保存' }}</span>
              <span>版本: {{ latestVersion ?? '-' }}</span>
              <span>数据表: {{ lastPublishTable || '-' }}</span>
              <span>最近保存: {{ lastSavedTime || '-' }}</span>
            </a-space>
          </div>
          <div class="vform-designer-body" data-testid="form-designer-body" :data-empty="isEmpty ? 'true' : 'false'">
            <VFormDesigner ref="designerRef" />
          </div>
        </div>
      </a-tab-pane>
      <a-tab-pane key="process" :disabled="!formKey">
        <template #tab>
          <span data-testid="tab-process-designer">流程设计（保存后可用）</span>
        </template>
        <FormProcessDesigner :form-key="formKey" />
      </a-tab-pane>
    </a-tabs>
  </PageWrapper>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { message } from 'ant-design-vue';
  import { PageWrapper } from '/@/components/Page';
  import { VFormDesigner } from 'vform3-builds';
  import FormProcessDesigner from './_components/FormProcessDesigner.vue';
  import { getLatestSchema, saveSchema, publishSchema } from './designer.api';
  import 'vform3-builds/dist/designer.style.css';

  const route = useRoute();
  const router = useRouter();
  const resolveTab = (value?: string) => (value === 'process' ? 'process' : 'form');
  const activeTab = ref(resolveTab(route.query.tab as string));
  const designerRef = ref<any>(null);
  const formKey = ref<string>('');
  const formName = ref<string>('');
  const isEmpty = ref(true);
  const storageKey = computed(() => (formKey.value ? `TRITIUM_VFORM_SCHEMA_${formKey.value}` : 'TRITIUM_VFORM_SCHEMA_NEW'));
  const latestVersion = ref<number | null>(null);
  const lastSavedTime = ref<string | null>(null);
  const lastPublishTable = ref<string | null>(null);

  const getDesignerApi = () => designerRef.value;
  const resolveFormKey = () => {
    if (route.query.mode === 'new') return '';
    return (route.query.formKey as string) || (route.params.formKey as string) || '';
  };
  const syncFormKeyFromRoute = () => {
    formKey.value = resolveFormKey();
    if (!formKey.value) {
      activeTab.value = 'form';
      formName.value = '';
    }
  };

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

  const updateFormMeta = (schema: Record<string, any> | null) => {
    if (!schema) return;
    const nextName = schema?.formConfig?.formName || schema?.formConfig?.title || '';
    formName.value = nextName || '';
    const widgets = Array.isArray(schema?.widgetList) ? schema.widgetList : [];
    isEmpty.value = widgets.length === 0;
  };

  const resetToEmptySchema = (silent = false) => {
    const api = getDesignerApi();
    if (api?.clearDesigner) {
      api.clearDesigner();
    } else if (api?.setFormJson) {
      api.setFormJson({ widgetList: [], formConfig: { formName: formName.value || '' } });
    }
    isEmpty.value = true;
    if (!silent) message.info('已进入新建表单，可开始设计');
  };

  const handleSave = async () => {
    const api = getDesignerApi();
    const schema = extractSchema(api);
    if (!schema) {
      message.error('设计器未就绪');
      return;
    }
    if (!formName.value.trim()) {
      message.warning('请先填写表单名称');
      return;
    }
    schema.formConfig = { ...(schema.formConfig || {}), formName: formName.value.trim() };
    updateFormMeta(schema);
    const schemaJson = JSON.stringify(schema);
    const needNewKey = !formKey.value;
    const nextFormKey = needNewKey
      ? `form_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      : formKey.value;
    try {
      const res = await saveSchema({ formKey: nextFormKey, schemaJson });
      if (needNewKey) {
        formKey.value = nextFormKey;
        const nextQuery = { ...route.query, formKey: nextFormKey };
        delete nextQuery.mode;
        await router.replace({ query: nextQuery });
      }
      latestVersion.value = res?.version ?? latestVersion.value;
      lastSavedTime.value = res?.savedTime ?? lastSavedTime.value;
      localStorage.setItem(`TRITIUM_VFORM_SCHEMA_${nextFormKey}`, schemaJson);
      message.success('表单已保存');
    } catch (err) {
      localStorage.setItem(needNewKey ? storageKey.value : `TRITIUM_VFORM_SCHEMA_${nextFormKey}`, schemaJson);
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
    updateFormMeta(parsed);
    if (!silent) message.success('表单已加载');
  };

  const loadFromBackend = async (silent = false) => {
    const res = await getLatestSchema({ formKey: formKey.value });
    if (!res?.schemaJson) {
      if (!silent) message.warning('未获取到表单数据，已加载空白画布');
      resetToEmptySchema(true);
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
    updateFormMeta(parsed);
    latestVersion.value = res?.version ?? latestVersion.value;
    lastSavedTime.value = res?.savedTime ?? lastSavedTime.value;
    localStorage.setItem(storageKey.value, res.schemaJson);
    if (!silent) message.success('表单已加载');
  };

  const handleLoad = async (silent = false) => {
    if (!formKey.value) {
      resetToEmptySchema(silent);
      return;
    }
    try {
      await loadFromBackend(silent);
      return;
    } catch (err) {
      if (!silent) message.warning('后端加载失败，改用本地数据');
    }
    loadFromLocal(silent);
  };

  const handlePublish = async () => {
    if (!formKey.value) {
      message.warning('请先保存表单');
      return;
    }
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
    formName.value = '';
    resetToEmptySchema(true);
    message.success('表单已重置');
  };

  const resetMeta = () => {
    latestVersion.value = null;
    lastSavedTime.value = null;
    lastPublishTable.value = null;
  };

  onMounted(() => {
    syncFormKeyFromRoute();
    if (!formKey.value) {
      resetToEmptySchema(true);
    } else {
      handleLoad(true);
    }
  });

  watch(formKey, (next) => {
    resetMeta();
    if (!next) {
      resetToEmptySchema(true);
      return;
    }
    handleLoad(true);
  });

  watch(
    () => route.query.tab,
    (tab) => {
      const nextTab = resolveTab(tab as string);
      activeTab.value = formKey.value ? nextTab : 'form';
    }
  );

  watch(
    () => [route.query.formKey, route.params.formKey, route.query.mode],
    () => {
      syncFormKeyFromRoute();
      if (!formKey.value) {
        resetMeta();
        resetToEmptySchema(true);
      } else {
        resetMeta();
        handleLoad(true);
      }
    }
  );

  watch(
    () => route.query.mode,
    (mode) => {
      if (mode === 'new') {
        formKey.value = '';
        formName.value = '';
        resetMeta();
        resetToEmptySchema(true);
      }
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

  .vform-designer-name {
    align-items: center;
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
