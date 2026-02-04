<template>
  <BpmListPage
    title="我已处理"
    test-id="bpm-done-page"
    :columns="columns"
    :fetch-page="fetchMyDone"
    :show-filter="true"
    :status-options="statusOptions"
    :get-actions="getActions"
  >
    <template #status="{ row }">
      <a-tag color="blue">已完成</a-tag>
    </template>
  </BpmListPage>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';
import BpmListPage from '../_components/BpmListPage.vue';
import { fetchMyDone } from '../bpmFetchers';
import { getRowActions } from '../bpmActions';

const router = useRouter();

const statusOptions = [
  { label: '已完成', value: 'finished' },
];

const columns = [
  { title: '任务ID', dataIndex: 'id', key: 'id', width: 220 },
  { title: '流程名称', dataIndex: 'processDefinitionName', key: 'processDefinitionName' },
  { title: '任务名称', dataIndex: 'name', key: 'name' },
  { title: '完成时间', dataIndex: 'endTime', key: 'endTime', width: 180 },
  { title: '状态', dataIndex: 'status', key: 'status', slot: 'status', width: 120 },
  { title: '操作', dataIndex: 'action', key: 'action', slot: 'action', width: 120 },
];

const handleOpen = (row: any) => {
  const taskId = row?.taskId || row?.id;
  if (!taskId) {
    return;
  }
  router.push({
    path: `/bpm/task/${taskId}/form`,
  });
};

const getActions = (row: any) => getRowActions('done', row, {
  handleOpen,
});
</script>
