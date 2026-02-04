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
import { createTaskExecutors } from './TaskExecutors';

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

const executors = createTaskExecutors({
  onRefresh: refresh,
  onOpenVars: (_row, data) => {
    varsData.value = data;
    varsVisible.value = true;
  },
  setVarsLoading: (loading) => {
    varsLoading.value = loading;
  },
});

const handleClaim = (row: any) => executors.handleClaim(row);
const handleApprove = (row: any) => executors.handleApprove(row);

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
      return executors.handleReject(row, reason);
    },
  });
};

const handleOpen = (row: any) => {
  if (!row?.taskId) {
    message.warning('未找到任务ID，无法打开表单');
    return;
  }
  router.push({
    path: `/bpm/task/${row.taskId}/form`,
  });
};

const handleVars = (row: any) => executors.loadVars(row);
</script>
