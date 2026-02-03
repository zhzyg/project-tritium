<template>
  <BpmListPage
    title="我发起的"
    test-id="bpm-my-page"
    :columns="columns"
    :fetch-page="fetchMyInitiated"
    :show-filter="true"
    :status-options="statusOptions"
    :get-actions="getActions"
  >
    <template #status="{ row }">
      <a-tag :color="row.endTime ? 'blue' : 'green'">
        {{ row.endTime ? 'Completed' : 'Running' }}
      </a-tag>
    </template>
  </BpmListPage>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';
import BpmListPage from '../_components/BpmListPage.vue';
import { fetchMyInitiated } from '../bpmFetchers';
import { getRowActions } from '../bpmActions';

const router = useRouter();

const statusOptions = [
  { label: 'Running', value: 'running' },
  { label: 'Completed', value: 'completed' },
];

const columns = [
  { title: 'Process ID', dataIndex: 'id', key: 'id', width: 220 },
  { title: 'Process Name', dataIndex: 'processDefinitionName', key: 'processDefinitionName' },
  { title: 'Start Time', dataIndex: 'startTime', key: 'startTime', width: 180 },
  { title: 'End Time', dataIndex: 'endTime', key: 'endTime', width: 180 },
  { title: 'Status', dataIndex: 'status', key: 'status', slot: 'status', width: 120 },
  { title: 'Actions', dataIndex: 'action', key: 'action', slot: 'action', width: 120 },
];

const handleOpen = (row: any) => {
  router.push({
    path: '/bpm/approve',
    query: { taskId: row.taskId || row.id } // For my-initiated, it might be processInstanceId
  });
};

const getActions = (row: any) => getRowActions('my', row, {
  handleOpen,
});
</script>