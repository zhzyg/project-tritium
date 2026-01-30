<template>
  <PageWrapper title="按表单发起" contentBackground>
    <a-card bordered size="small">
      <div class="start-toolbar">
        <a-space wrap>
          <a-input v-model:value="formKey" placeholder="formKey" style="width: 200px" />
          <a-input v-model:value="recordId" placeholder="recordId" style="width: 320px" />
          <a-input-number v-model:value="amountValue" :min="0" style="width: 160px" placeholder="amount" />
          <a-button :loading="creating" @click="createTestRecord">创建测试记录</a-button>
          <a-button type="primary" :loading="starting" @click="startProcess">发起流程</a-button>
          <a-button :disabled="!processInfo" @click="fetchStatus">刷新状态</a-button>
        </a-space>
      </div>

      <a-divider />

      <a-descriptions title="发起结果" :column="1" size="small">
        <a-descriptions-item label="processInstanceId">{{ processInfo?.processInstanceId || '-' }}</a-descriptions-item>
        <a-descriptions-item label="processKey">{{ processInfo?.processKey || '-' }}</a-descriptions-item>
        <a-descriptions-item label="businessKey">{{ processInfo?.businessKey || '-' }}</a-descriptions-item>
      </a-descriptions>

      <a-divider />

      <a-descriptions title="流程状态" :column="1" size="small">
        <a-descriptions-item label="ended">{{ statusInfo?.ended ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="businessKey">{{ statusInfo?.businessKey || '-' }}</a-descriptions-item>
      </a-descriptions>
      <a-table
        :data-source="statusInfo?.currentTasks || []"
        :columns="taskColumns"
        row-key="taskId"
        size="small"
        :pagination="false"
        style="margin-top: 12px"
      />
    </a-card>
  </PageWrapper>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue';
  import { message } from 'ant-design-vue';
  import { PageWrapper } from '/@/components/Page';
  import { startByForm, getProcessStatus } from '/@/api/bpm/flowable';
  import { getLatestPublishedSchema, insertRecord } from '/@/views/form/runtime/runtime.api';

  const formKey = ref('dev');
  const recordId = ref('');
  const amountValue = ref<number | null>(20001);
  const creating = ref(false);
  const starting = ref(false);
  const processInfo = ref<any>(null);
  const statusInfo = ref<any>(null);

  const taskColumns = computed(() => [
    { title: 'Task ID', dataIndex: 'taskId', key: 'taskId', width: 220 },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 160 },
    { title: 'Assignee', dataIndex: 'assignee', key: 'assignee', width: 120 },
    { title: 'Candidate Groups', dataIndex: 'candidateGroups', key: 'candidateGroups' },
  ]);

  const createTestRecord = async () => {
    if (!formKey.value) {
      message.warning('formKey 必填');
      return;
    }
    creating.value = true;
    try {
      const published = await getLatestPublishedSchema({ formKey: formKey.value });
      const metas = published?.fieldMetas || [];
      const numericMeta = metas.find((meta) => {
        const type = (meta.widgetType || meta.dbType || '').toLowerCase();
        return type.includes('number') || type.includes('decimal');
      });
      if (!numericMeta?.fieldKey) {
        message.error('未找到数值字段，无法创建测试记录');
        return;
      }
      if (amountValue.value === null || Number.isNaN(amountValue.value)) {
        message.error('amount 不能为空');
        return;
      }
      const data: Record<string, any> = { [numericMeta.fieldKey]: amountValue.value };
      const res = await insertRecord({ formKey: formKey.value, data });
      recordId.value = res?.recordId || '';
      message.success(`recordId: ${recordId.value}`);
    } catch (err: any) {
      message.error(err?.message || '创建记录失败');
    } finally {
      creating.value = false;
    }
  };

  const startProcess = async () => {
    if (!formKey.value || !recordId.value) {
      message.warning('formKey 和 recordId 必填');
      return;
    }
    starting.value = true;
    try {
      const res = await startByForm({ formKey: formKey.value, recordId: recordId.value });
      processInfo.value = res;
      message.success('流程已发起');
      await fetchStatus();
    } catch (err: any) {
      message.error(err?.message || '发起失败');
    } finally {
      starting.value = false;
    }
  };

  const fetchStatus = async () => {
    if (!processInfo.value?.processInstanceId) {
      statusInfo.value = null;
      return;
    }
    try {
      statusInfo.value = await getProcessStatus({ processInstanceId: processInfo.value.processInstanceId });
    } catch (err: any) {
      message.error(err?.message || '状态查询失败');
    }
  };
</script>

<style scoped>
  .start-toolbar {
    margin-bottom: 8px;
  }
</style>
