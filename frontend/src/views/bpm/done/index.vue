<template>
  <BpmListPage
    title="我已处理"
    test-id="bpm-done-page"
    :columns="columns"
    :fetch-page="fetchMyDone"
    :show-filter="true"
    :get-actions="getActions"
  >
    <template #status="{ row }">
      <a-tag color="blue">Finished</a-tag>
    </template>
  </BpmListPage>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';
import BpmListPage from '../_components/BpmListPage.vue';
import { fetchMyDone } from '../bpmFetchers';
import { getRowActions } from '../bpmActions';

const router = useRouter();

const columns = [
  { title: 'Task ID', dataIndex: 'id', key: 'id', width: 220 },
  { title: 'Process Name', dataIndex: 'processDefinitionName', key: 'processDefinitionName' },
  { title: 'Task Name', dataIndex: 'name', key: 'name' },
  { title: 'End Time', dataIndex: 'endTime', key: 'endTime', width: 180 },
  { title: 'Status', dataIndex: 'status', key: 'status', slot: 'status', width: 120 },
  { title: 'Actions', dataIndex: 'action', key: 'action', slot: 'action', width: 120 },
];

const handleOpen = (row: any) => {
  router.push({
    path: '/bpm/approve',
    query: { taskId: row.id }
  });
};

const getActions = (row: any) => getRowActions('done', row, {
  handleOpen,
});
</script>
