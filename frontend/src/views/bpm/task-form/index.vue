<template>
  <PageWrapper :title="pageTitle" contentFullHeight>
    <div class="task-form-page" data-testid="bpm-task-form">
      <div class="task-form-toolbar">
        <a-space>
          <a-button @click="goBack">返回</a-button>
          <a-button :loading="loading" @click="loadAll">重试</a-button>
        </a-space>
      </div>

      <a-alert
        v-if="errorMessage"
        class="mb-4"
        type="error"
        show-icon
        :message="errorMessage"
      />

      <a-alert
        v-else-if="contextLoaded && !recordId"
        class="mb-4"
        type="warning"
        show-icon
        message="无法解析业务表单，请检查流程变量/业务键配置。"
      >
        <template #description>
          <div class="context-summary">
            <div>taskId: {{ taskId || '-' }}</div>
            <div>procInsId: {{ procInsId || '-' }}</div>
            <div>businessKey: {{ businessKey || '-' }}</div>
            <div>formKey: {{ formKey || '-' }}</div>
          </div>
        </template>
      </a-alert>

      <a-descriptions v-if="contextLoaded" bordered size="small" class="mb-4">
        <a-descriptions-item label="流程">{{ processName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="任务">{{ taskName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="Task ID">{{ taskId || '-' }}</a-descriptions-item>
        <a-descriptions-item label="实例">{{ procInsId || '-' }}</a-descriptions-item>
        <a-descriptions-item label="业务键">{{ businessKey || '-' }}</a-descriptions-item>
        <a-descriptions-item label="记录ID">{{ recordId || '-' }}</a-descriptions-item>
        <a-descriptions-item label="表单">{{ formKey || '-' }}</a-descriptions-item>
      </a-descriptions>

      <div class="form-container" data-testid="bpm-task-form-render">
        <VFormRender ref="renderRef" :form-json="formJson" :form-data="formData" :option-data="optionData" />
        <a-empty v-if="contextLoaded && recordId && !schemaReady" description="未找到可渲染表单" />
      </div>
    </div>
  </PageWrapper>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { message } from 'ant-design-vue';
  import { PageWrapper } from '/@/components/Page';
  import { VFormRender } from 'vform3-builds';
  import 'vform3-builds/dist/render.style.css';
  import { getProcessContext, getTaskContext } from '/@/api/bpm/flowable';
  import { getLatestPublishedSchemaJson, getRecord } from '/@/views/form/runtime/runtime.api';

  const route = useRoute();
  const router = useRouter();

  const renderRef = ref<any>(null);
  const formJson = ref<Record<string, any>>({ widgetList: [], formConfig: {} });
  const formData = reactive<Record<string, any>>({});
  const optionData = reactive<Record<string, any>>({});

  const taskId = computed(() => (route.params.taskId as string) || (route.query.taskId as string) || '');
  const procInsId = computed(() => (route.params.procInsId as string) || (route.query.procInsId as string) || '');

  const taskName = ref('');
  const processName = ref('');
  const businessKey = ref('');
  const recordId = ref('');
  const formKey = ref('');

  const loading = ref(false);
  const schemaReady = ref(false);
  const contextLoaded = ref(false);
  const errorMessage = ref('');

  const pageTitle = computed(() => {
    if (processName.value && taskName.value) {
      return `${processName.value} - ${taskName.value}`;
    }
    return '表单详情';
  });

  const resetFormData = () => {
    Object.keys(formData).forEach((key) => delete formData[key]);
    if (renderRef.value?.setFormData) {
      renderRef.value.setFormData({});
    }
  };

  const applyReadonly = () => {
    if (renderRef.value?.disableForm) {
      renderRef.value.disableForm();
    }
  };

  const loadContext = async () => {
    contextLoaded.value = false;
    errorMessage.value = '';
    recordId.value = '';
    formKey.value = '';
    businessKey.value = '';
    taskName.value = '';
    processName.value = '';

    if (taskId.value) {
      const ctx = await getTaskContext({ taskId: taskId.value });
      recordId.value = ctx?.recordId || '';
      formKey.value = ctx?.formKey || '';
      businessKey.value = ctx?.businessKey || '';
      taskName.value = ctx?.taskName || '';
      processName.value = ctx?.processName || '';
      contextLoaded.value = true;
      return;
    }

    if (procInsId.value) {
      const ctx = await getProcessContext({ processInstanceId: procInsId.value });
      recordId.value = ctx?.recordId || '';
      formKey.value = ctx?.formKey || '';
      businessKey.value = ctx?.businessKey || '';
      taskName.value = ctx?.taskName || '';
      processName.value = ctx?.processName || '';
      contextLoaded.value = true;
      return;
    }

    throw new Error('taskId/procInsId 缺失');
  };

  const loadForm = async () => {
    schemaReady.value = false;
    formJson.value = { widgetList: [], formConfig: {} };
    resetFormData();

    if (!recordId.value) {
      return;
    }
    if (!formKey.value) {
      throw new Error('未解析到 formKey');
    }

    const schemaRes = await getLatestPublishedSchemaJson({ formKey: formKey.value });
    if (!schemaRes?.schemaJson) {
      throw new Error('schemaJson 为空');
    }

    const parsed = JSON.parse(schemaRes.schemaJson);
    formJson.value = parsed;
    if (renderRef.value?.setFormJson) {
      renderRef.value.setFormJson(parsed);
    }

    const recordRes = await getRecord({ id: recordId.value });
    if (recordRes?.dataJson) {
      const data = JSON.parse(recordRes.dataJson);
      Object.assign(formData, data);
      if (renderRef.value?.setFormData) {
        renderRef.value.setFormData(data);
      }
    }

    schemaReady.value = true;
    applyReadonly();
  };

  const loadAll = async () => {
    loading.value = true;
    try {
      await loadContext();
      await loadForm();
    } catch (err: any) {
      errorMessage.value = err?.message || '加载失败';
      message.error(errorMessage.value);
    } finally {
      loading.value = false;
    }
  };

  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/bpm/tasks');
  };

  watch([taskId, procInsId], () => {
    loadAll();
  });

  onMounted(() => {
    loadAll();
  });
</script>

<style scoped>
  .task-form-page {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .task-form-toolbar {
    display: flex;
    justify-content: flex-start;
  }

  .form-container {
    min-height: 240px;
    background: #f9f9f9;
    padding: 12px;
    border-radius: 6px;
    pointer-events: none;
  }

  .context-summary {
    color: rgba(0, 0, 0, 0.65);
    font-size: 12px;
    display: grid;
    gap: 4px;
  }
</style>
