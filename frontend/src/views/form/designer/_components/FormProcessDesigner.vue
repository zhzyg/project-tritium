<template>
  <div class="process-designer" data-testid="process-designer-root">
    <div class="process-toolbar">
      <a-space>
        <a-button type="primary" :loading="saving" data-testid="btn-bpmn-save" @click="handleSave">保存草稿</a-button>
        <a-button :loading="publishing" data-testid="btn-bpmn-publish" @click="handlePublish">发布部署</a-button>
        <a-button @click="handleReload">重新加载</a-button>
      </a-space>
      <a-space class="process-meta" size="large">
        <span>formKey: {{ formKey }}</span>
        <span>status: {{ status || '-' }}</span>
        <span>procDefKey: {{ procDefKey || '-' }}</span>
        <span>version: {{ version ?? '-' }}</span>
      </a-space>
    </div>

    <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage" class="mb-3" />

    <div ref="canvasRef" class="process-canvas" data-testid="form-bpmn-canvas"></div>
  </div>
</template>

<script lang="ts" setup>
  import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
  import { message } from 'ant-design-vue';
  import BpmnModeler from 'bpmn-js/lib/Modeler';
  import { getFormBpmn, publishFormBpmn, saveFormBpmn } from '/@/api/form/bpmn';
  import 'bpmn-js/dist/assets/diagram-js.css';
  import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

  const props = defineProps<{ formKey: string }>();

  const canvasRef = ref<HTMLDivElement | null>(null);
  const modelerRef = ref<any>(null);
  const saving = ref(false);
  const publishing = ref(false);
  const status = ref('');
  const procDefKey = ref('');
  const version = ref<number | null>(null);
  const errorMessage = ref('');

  const buildDefaultXml = (key: string) => `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:flowable="http://flowable.org/bpmn"
             targetNamespace="http://tritium/flowable">
  <process id="FORM_PROCESS_${key || 'DEFAULT'}" name="Form Process" isExecutable="true">
    <startEvent id="startEvent" name="Start" />
    <sequenceFlow id="flow_start_task" sourceRef="startEvent" targetRef="userTask" />
    <userTask id="userTask" name="Approve" />
    <sequenceFlow id="flow_task_end" sourceRef="userTask" targetRef="endEvent" />
    <endEvent id="endEvent" name="End" />
  </process>
</definitions>`;

  const ensureModeler = () => {
    if (modelerRef.value || !canvasRef.value) return;
    modelerRef.value = new BpmnModeler({
      container: canvasRef.value,
    });
  };

  const importXml = async (xml: string) => {
    if (!modelerRef.value) return;
    try {
      await modelerRef.value.importXML(xml);
    } catch (err: any) {
      throw new Error(err?.message || 'BPMN XML 导入失败');
    }
  };

  const loadFromServer = async () => {
    if (!props.formKey) {
      throw new Error('formKey 缺失');
    }
    const res = await getFormBpmn({ formKey: props.formKey });
    if (res?.bpmnXml) {
      status.value = res.status || 'draft';
      procDefKey.value = res.procDefKey || '';
      version.value = res.version ?? null;
      return res.bpmnXml;
    }
    status.value = 'draft';
    procDefKey.value = '';
    version.value = null;
    return '';
  };

  const handleReload = async () => {
    errorMessage.value = '';
    ensureModeler();
    try {
      const xml = await loadFromServer();
      await importXml(xml || buildDefaultXml(props.formKey));
      if (!xml) {
        message.info('未找到草稿，已加载默认模板');
      }
    } catch (err: any) {
      errorMessage.value = err?.message || '加载失败';
      message.error(errorMessage.value);
      await importXml(buildDefaultXml(props.formKey)).catch(() => {});
    }
  };

  const fetchXml = async () => {
    if (!modelerRef.value) {
      throw new Error('流程设计器未就绪');
    }
    try {
      const { xml } = await modelerRef.value.saveXML({ format: true });
      return xml as string;
    } catch (err: any) {
      throw new Error(err?.message || '保存 XML 失败');
    }
  };

  const handleSave = async () => {
    saving.value = true;
    try {
      const xml = await fetchXml();
      const res = await saveFormBpmn({ formKey: props.formKey, bpmnXml: xml });
      status.value = res?.status || 'draft';
      message.success('流程草稿已保存');
    } catch (err: any) {
      message.error(err?.message || '保存失败');
    } finally {
      saving.value = false;
    }
  };

  const handlePublish = async () => {
    publishing.value = true;
    try {
      await handleSave();
      const res = await publishFormBpmn({ formKey: props.formKey });
      status.value = 'published';
      procDefKey.value = res?.procDefKey || procDefKey.value;
      version.value = res?.version ?? version.value;
      message.success(`发布成功：${res?.procDefKey || ''} v${res?.version ?? ''}`);
    } catch (err: any) {
      message.error(err?.message || '发布失败');
    } finally {
      publishing.value = false;
    }
  };

  onMounted(() => {
    ensureModeler();
    handleReload();
  });

  onBeforeUnmount(() => {
    if (modelerRef.value?.destroy) {
      modelerRef.value.destroy();
    }
    modelerRef.value = null;
  });

  watch(
    () => props.formKey,
    () => {
      status.value = '';
      procDefKey.value = '';
      version.value = null;
      handleReload();
    }
  );
</script>

<style scoped>
  .process-designer {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 12px;
  }

  .process-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }

  .process-meta {
    color: #6b7280;
    font-size: 12px;
  }

  .process-canvas {
    flex: 1;
    min-height: 520px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #fff;
  }
</style>
