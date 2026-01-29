<template>
  <PageWrapper title="表单设计器（VForm）" contentFullHeight>
    <div class="vform-designer-page">
      <div class="vform-designer-toolbar">
        <a-space>
          <a-button type="primary" @click="handleSave">Save</a-button>
          <a-button @click="handleLoad">Load</a-button>
          <a-button danger @click="handleReset">Reset</a-button>
        </a-space>
      </div>
      <div class="vform-designer-body">
        <VFormDesigner ref="designerRef" />
      </div>
    </div>
  </PageWrapper>
</template>

<script lang="ts" setup>
  import { onMounted, ref } from 'vue';
  import { message } from 'ant-design-vue';
  import { PageWrapper } from '/@/components/Page';
  import { VFormDesigner } from 'vform3-builds';
  import 'vform3-builds/dist/designer.style.css';

  const STORAGE_KEY = 'TRITIUM_VFORM_SCHEMA_DEV';
  const designerRef = ref<any>(null);

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

  const handleSave = () => {
    const api = getDesignerApi();
    const schema = extractSchema(api);
    if (!schema) {
      message.error('Designer API not ready');
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
    message.success('Schema saved');
  };

  const handleLoad = (silent = false) => {
    const raw = localStorage.getItem(STORAGE_KEY);
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
      message.error('Designer API not ready');
      return;
    }
    if (!silent) message.success('Schema loaded');
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    const api = getDesignerApi();
    if (api?.setFormJson) {
      api.setFormJson({ widgetList: [], formConfig: {} });
    }
    message.success('Schema reset');
  };

  onMounted(() => {
    handleLoad(true);
  });
</script>

<style scoped>
  .vform-designer-page {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .vform-designer-toolbar {
    margin-bottom: 12px;
  }

  .vform-designer-body {
    flex: 1;
    min-height: 0;
  }

  .vform-designer-body :deep(.main-container) {
    height: 100%;
  }
</style>
