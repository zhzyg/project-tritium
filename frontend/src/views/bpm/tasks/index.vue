<template>
  <div>
    <BpmListPage
      title="我的待办"
      test-id="bpm-tasks-page"
      :columns="columns"
      :fetch-page="fetchMyTasks"
      :show-filter="true"
      :show-time-range="true"
      :status-options="statusOptions"
      ref="listPageRef"
    >
      <template #groups="{ row }">
        <a-tag v-for="group in row.candidateGroups" :key="group" color="blue" style="margin-right: 5px;">
          {{ group }}
        </a-tag>
      </template>
      <template #status="{ row }">
        <a-tag :color="row.assignee ? 'green' : 'orange'">
          {{ row.assignee ? 'Claimed' : 'Unclaimed' }}
        </a-tag>
      </template>
      
      <!-- New modularized actions -->
      <template #action="{ row }">
        <TaskRowActions 
          :row="row" 
          scene="tasks"
          @claim="handleClaim"
          @approve="handleApprove"
          @reject="handleReject"
          @open="handleOpen"
          @open-vars="handleVars"
        />
      </template>
    </BpmListPage>

    <VarsDialog 
      v-model:visible="varsVisible"
      :loading="varsLoading"
      :vars-data="varsData"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, h } from 'vue';
import { useRouter } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import BpmListPage from '../_components/BpmListPage.vue';
import TaskRowActions from './_components/TaskRowActions.vue';
import VarsDialog from './_components/VarsDialog.vue';
import { fetchMyTasks } from '../bpmFetchers';
import { claimTask, completeTask, getProcessVars } from '/@/api/bpm/flowable';

const router = useRouter();
const listPageRef = ref();

const varsVisible = ref(false);
const varsLoading = ref(false);
const varsData = ref<any>(null);

const statusOptions = [
  { label: 'Unclaimed', value: 'unclaimed' },
  { label: 'Claimed', value: 'claimed' },
];

const columns = [
  { title: 'Task ID', dataIndex: 'taskId', key: 'taskId', width: 220 },
  { title: 'Process Name', dataIndex: 'processName', key: 'processName' },
  { title: 'Task Name', dataIndex: 'name', key: 'name' },
  { title: 'Create Time', dataIndex: 'createTime', key: 'createTime', width: 180 },
  { title: 'Assignee', dataIndex: 'assignee', key: 'assignee', width: 120 },
  { title: 'Groups', dataIndex: 'candidateGroups', key: 'candidateGroups', slot: 'groups' },
  { title: 'Status', dataIndex: 'status', key: 'status', slot: 'status', width: 100 },
  { title: 'Actions', dataIndex: 'action', key: 'action', slot: 'action', width: 280 },
];

const refresh = () => listPageRef.value?.loadData();

const handleClaim = async (row: any) => {
  try {
    await claimTask({ taskId: row.taskId });
    message.success('Claimed successfully');
    refresh();
  } catch (error: any) {
    message.error('Claim failed: ' + error.message);
  }
};

const handleApprove = async (row: any) => {
  try {
    await completeTask({
      taskId: row.taskId,
      variables: { status: 'APPROVED', reason: '', updatedAt: new Date().toISOString() }
    });
    message.success('Approved successfully');
    await handleVars(row);
    refresh();
  } catch (error: any) {
    message.error('Approve failed: ' + error.message);
  }
};

const handleReject = (row: any) => {
  let reason = '';
  Modal.confirm({
    title: 'Reject Task',
    content: () => {
      return h('div', [
        h('p', 'Please input reject reason:'),
        h('textarea', {
          class: 'ant-input',
          rows: 3,
          value: reason,
          onInput: (e: any) => (reason = e.target.value),
        }),
      ]);
    },
    onOk: async () => {
      if (!reason.trim()) {
        message.warning('Reason is required');
        return Promise.reject();
      }
      try {
        await completeTask({
          taskId: row.taskId,
          variables: { status: 'REJECTED', reason, updatedAt: new Date().toISOString() }
        });
        message.success('Rejected successfully');
        await handleVars(row);
        refresh();
      } catch (error: any) {
        message.error('Reject failed: ' + error.message);
      }
    },
  });
};

const handleOpen = (row: any) => {
  router.push({
    path: '/bpm/approve',
    query: { taskId: row.taskId }
  });
};

const handleVars = async (row: any) => {
  if (!row.processInstanceId) {
    message.warning('No Process Instance ID');
    return;
  }
  varsVisible.value = true;
  varsLoading.value = true;
  varsData.value = null;
  try {
    const res = await getProcessVars({ processInstanceId: row.processInstanceId });
    varsData.value = res;
  } catch (error: any) {
    message.error('Failed to load variables: ' + error.message);
  } finally {
    varsLoading.value = false;
  }
};
</script>