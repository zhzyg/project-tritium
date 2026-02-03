<template>
  <BpmListPage
    title="我已处理"
    test-id="bpm-done-page"
    :columns="columns"
    :fetch-page="fetchMyDone"
  >
    <template #action="{ row }">
      <el-button size="small" @click="handleOpenForm(row)">Open</el-button>
    </template>
  </BpmListPage>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';
import BpmListPage from '../_components/BpmListPage.vue';
import { fetchMyDone } from '../bpmFetchers';

const router = useRouter();

const columns = [
  { label: 'Task ID', prop: 'taskId', minWidth: 220 },
  { label: 'Process Name', prop: 'processName', minWidth: 180 },
  { label: 'Task Name', prop: 'name', minWidth: 180 },
  { label: 'Proc Inst ID', prop: 'processInstanceId', minWidth: 220 },
  { label: 'End Time', prop: 'endTime', minWidth: 180 },
  { label: 'Assignee', prop: 'assignee', minWidth: 150 },
  { label: 'Actions', prop: 'action', minWidth: 120, slot: 'action' },
];

const handleOpenForm = (row: any) => {
  router.push({
    path: '/bpm/approve',
    query: { taskId: row.taskId }
  });
};
</script>