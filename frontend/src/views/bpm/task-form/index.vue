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

      <a-alert
        v-if="isTaskView && contextLoaded && !taskActive"
        class="mb-4"
        type="info"
        show-icon
        message="该任务已完成，无法再次审批。"
      />

      <div v-if="isTaskView" class="task-comment-box">
        <div class="task-comment-label">审批意见</div>
        <a-input
          v-model:value="comment"
          type="textarea"
          :rows="3"
          placeholder="请输入审批意见"
          :disabled="!taskActive"
          data-testid="bpm-task-comment"
        />
        <a-space class="task-comment-actions">
          <a-button
            type="primary"
            :loading="actionLoading"
            :disabled="!taskActive"
            data-testid="bpm-task-approve"
            @click="handleApprove"
          >
            通过
          </a-button>
          <a-button
            danger
            :loading="actionLoading"
            :disabled="!taskActive"
            data-testid="bpm-task-reject"
            @click="handleReject"
          >
            驳回
          </a-button>
        </a-space>
      </div>

      <div
        class="form-container"
        data-testid="bpm-task-form-render"
        :data-editable-count="editableFields.length"
      >
        <VFormRender ref="renderRef" :form-json="formJson" :form-data="formData" :option-data="optionData" />
        <a-empty v-if="contextLoaded && recordId && !schemaReady" description="未找到可渲染表单" />
      </div>

      <div v-if="contextLoaded && procInsId" class="task-comments">
        <div class="task-comment-label">审批记录</div>
        <a-empty v-if="!commentItems.length" description="暂无审批记录" />
        <a-timeline v-else class="task-comment-timeline">
          <a-timeline-item v-for="(item, index) in commentItems" :key="index">
            <div class="comment-title">
              {{ item.time }} · {{ item.taskName || item.type || '任务' }}
              <span v-if="item.assignee" class="comment-user">({{ item.assignee }})</span>
            </div>
            <div v-if="item.comment" class="comment-message">{{ item.comment }}</div>
          </a-timeline-item>
        </a-timeline>
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
  import { completeTask, getProcessContext, getProcessTrace, getTaskContext, getTaskFieldPerm } from '/@/api/bpm/flowable';
  import { getLatestPublishedSchemaJson, getRecord } from '/@/views/form/runtime/runtime.api';

  const route = useRoute();
  const router = useRouter();

  const renderRef = ref<any>(null);
  const formJson = ref<Record<string, any>>({ widgetList: [], formConfig: {} });
  const formData = reactive<Record<string, any>>({});
  const optionData = reactive<Record<string, any>>({});

  const taskId = computed(() => (route.params.taskId as string) || (route.query.taskId as string) || '');
  const routeProcInsId = computed(() => (route.params.procInsId as string) || (route.query.procInsId as string) || '');
  const isTaskView = computed(() => !!taskId.value);

  const taskName = ref('');
  const processName = ref('');
  const processDefinitionKey = ref('');
  const taskDefinitionKey = ref('');
  const businessKey = ref('');
  const recordId = ref('');
  const formKey = ref('');
  const taskActive = ref(false);
  const procInsId = ref('');

  const loading = ref(false);
  const actionLoading = ref(false);
  const schemaReady = ref(false);
  const contextLoaded = ref(false);
  const errorMessage = ref('');
  const comment = ref('');
  const traceData = ref<any[]>([]);
  const editableFields = ref<string[]>([]);
  const editableFieldsLoaded = ref(false);
  const originalData = ref<Record<string, any>>({});

  const commentItems = computed(() =>
    traceData.value.filter((item) => item?.comment || item?.taskName || item?.type)
  );

  const pageTitle = computed(() => {
    if (processName.value && taskName.value) {
      return `${processName.value} - ${taskName.value}`;
    }
    return '表单详情';
  });

  const resetFormData = () => {
    Object.keys(formData).forEach((key) => delete formData[key]);
    originalData.value = {};
    if (renderRef.value?.setFormData) {
      renderRef.value.setFormData({});
    }
  };

  const getChildWidgetLists = (widget: any): any[][] => {
    const lists: any[][] = [];
    if (Array.isArray(widget?.widgetList)) {
      lists.push(widget.widgetList);
    }
    if (Array.isArray(widget?.children)) {
      lists.push(widget.children);
    }
    if (Array.isArray(widget?.tabs)) {
      widget.tabs.forEach((tab: any) => {
        if (Array.isArray(tab?.widgetList)) {
          lists.push(tab.widgetList);
        }
      });
    }
    if (Array.isArray(widget?.rows)) {
      widget.rows.forEach((row: any) => {
        if (Array.isArray(row?.cols)) {
          row.cols.forEach((col: any) => {
            if (Array.isArray(col?.widgetList)) {
              lists.push(col.widgetList);
            }
          });
        }
        if (Array.isArray(row?.columns)) {
          row.columns.forEach((col: any) => {
            if (Array.isArray(col?.widgetList)) {
              lists.push(col.widgetList);
            }
          });
        }
      });
    }
    if (Array.isArray(widget?.cols)) {
      widget.cols.forEach((col: any) => {
        if (Array.isArray(col?.widgetList)) {
          lists.push(col.widgetList);
        }
      });
    }
    return lists;
  };

  const applyFieldPerm = (schema: Record<string, any>) => {
    const whitelist = new Set(editableFields.value || []);
    const walk = (widgets: any[]) => {
      if (!Array.isArray(widgets)) {
        return;
      }
      widgets.forEach((widget) => {
        if (!widget || typeof widget !== 'object') {
          return;
        }
        const fieldKey =
          widget?.options?.name || widget?.options?.field || widget?.field || widget?.name;
        const isFieldWidget = widget?.formItemFlag === true || !!fieldKey;
        if (isFieldWidget) {
          const editable = fieldKey ? whitelist.has(fieldKey) : false;
          if (widget.options) {
            widget.options.disabled = !editable;
            widget.options.readonly = !editable;
          }
          widget.disabled = !editable;
          widget.readonly = !editable;
        }
        const childLists = getChildWidgetLists(widget);
        childLists.forEach((list) => walk(list));
      });
    };
    walk(schema?.widgetList || []);
  };

  const loadContext = async () => {
    contextLoaded.value = false;
    errorMessage.value = '';
    recordId.value = '';
    formKey.value = '';
    businessKey.value = '';
    taskName.value = '';
    processName.value = '';
    processDefinitionKey.value = '';
    taskDefinitionKey.value = '';
    taskActive.value = false;
    editableFields.value = [];
    editableFieldsLoaded.value = false;

    if (taskId.value) {
      const ctx = await getTaskContext({ taskId: taskId.value });
      recordId.value = ctx?.recordId || '';
      formKey.value = ctx?.formKey || '';
      businessKey.value = ctx?.businessKey || '';
      taskName.value = ctx?.taskName || '';
      processName.value = ctx?.processName || '';
      processDefinitionKey.value = ctx?.processDefinitionKey || '';
      taskDefinitionKey.value = ctx?.taskDefinitionKey || '';
      taskActive.value = ctx?.active !== false;
      procInsId.value = ctx?.processInstanceId || '';
      contextLoaded.value = true;
      return;
    }

    if (routeProcInsId.value) {
      const ctx = await getProcessContext({ processInstanceId: routeProcInsId.value });
      recordId.value = ctx?.recordId || '';
      formKey.value = ctx?.formKey || '';
      businessKey.value = ctx?.businessKey || '';
      taskName.value = ctx?.taskName || '';
      processName.value = ctx?.processName || '';
      processDefinitionKey.value = ctx?.processDefinitionKey || '';
      taskActive.value = false;
      procInsId.value = ctx?.processInstanceId || routeProcInsId.value || '';
      contextLoaded.value = true;
      return;
    }

    throw new Error('taskId/procInsId 缺失');
  };

  const loadFieldPerm = async () => {
    editableFields.value = [];
    editableFieldsLoaded.value = false;
    if (!isTaskView.value) {
      editableFieldsLoaded.value = true;
      return;
    }
    if (!processDefinitionKey.value || !taskDefinitionKey.value || !formKey.value) {
      editableFieldsLoaded.value = true;
      return;
    }
    try {
      const res = await getTaskFieldPerm({
        procDefKey: processDefinitionKey.value,
        taskDefKey: taskDefinitionKey.value,
        formKey: formKey.value,
      });
      editableFields.value = res?.editableFields || [];
    } catch (err) {
      // ignore
    } finally {
      editableFieldsLoaded.value = true;
    }
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
    applyFieldPerm(parsed);
    formJson.value = parsed;
    if (renderRef.value?.setFormJson) {
      renderRef.value.setFormJson(parsed);
    }

    const recordRes = await getRecord({ id: recordId.value });
    if (recordRes?.dataJson) {
      const data = JSON.parse(recordRes.dataJson);
      originalData.value = { ...data };
      Object.assign(formData, data);
      if (renderRef.value?.setFormData) {
        renderRef.value.setFormData(data);
      }
    }

    schemaReady.value = true;
  };

  const loadTrace = async () => {
    traceData.value = [];
    if (!procInsId.value) {
      return;
    }
    try {
      const res = await getProcessTrace({ procInstId: procInsId.value });
      traceData.value = res || [];
    } catch (err) {
      // ignore
    }
  };

  const buildPatchData = async () => {
    if (!editableFields.value.length) {
      return null;
    }
    let currentData: Record<string, any> = {};
    if (renderRef.value?.getFormData) {
      try {
        currentData = await renderRef.value.getFormData();
      } catch (err) {
        currentData = { ...formData };
      }
    } else {
      currentData = { ...formData };
    }
    const patch: Record<string, any> = {};
    editableFields.value.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(currentData, key)) {
        patch[key] = currentData[key];
      }
    });
    return patch;
  };

  const submitTask = async (action: 'APPROVE' | 'REJECT') => {
    if (!taskId.value) {
      return;
    }
    const payload = comment.value?.trim();
    if (action === 'REJECT' && !payload) {
      message.warning('请填写驳回意见');
      return;
    }
    actionLoading.value = true;
    try {
      const patchData = await buildPatchData();
      await completeTask({
        taskId: taskId.value,
        formKey: formKey.value,
        recordId: recordId.value,
        comment: payload,
        patchData: patchData && Object.keys(patchData).length ? patchData : undefined,
        variables: {
          status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          action,
          updatedAt: new Date().toISOString(),
        },
      });
      message.success(action === 'APPROVE' ? '已通过' : '已驳回');
      comment.value = '';
      router.push('/bpm/tasks');
    } catch (err: any) {
      message.error(err?.message || '提交失败');
    } finally {
      actionLoading.value = false;
    }
  };

  const handleApprove = () => submitTask('APPROVE');
  const handleReject = () => submitTask('REJECT');

  const loadAll = async () => {
    loading.value = true;
    try {
      await loadContext();
      await loadFieldPerm();
      await loadForm();
      await loadTrace();
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

  watch([taskId, routeProcInsId], () => {
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
  }

  .task-comment-box {
    background: #fff;
    padding: 12px;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .task-comment-label {
    font-weight: 500;
    color: rgba(0, 0, 0, 0.85);
  }

  .task-comment-actions {
    margin-top: 4px;
  }

  .task-comments {
    background: #fff;
    padding: 12px;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .task-comment-timeline {
    margin-top: 6px;
  }

  .comment-title {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.85);
  }

  .comment-user {
    margin-left: 6px;
    color: rgba(0, 0, 0, 0.45);
  }

  .comment-message {
    margin-top: 4px;
    color: rgba(0, 0, 0, 0.65);
    font-style: italic;
  }

  .context-summary {
    color: rgba(0, 0, 0, 0.65);
    font-size: 12px;
    display: grid;
    gap: 4px;
  }
</style>
