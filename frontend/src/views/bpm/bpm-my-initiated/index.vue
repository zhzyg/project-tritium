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
        {{ row.endTime ? '已完成' : '进行中' }}
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
  { label: '进行中', value: 'running' },
  { label: '已完成', value: 'completed' },
];

const columns = [
  { title: '流程ID', dataIndex: 'id', key: 'id', width: 220 },
  { title: '流程名称', dataIndex: 'processDefinitionName', key: 'processDefinitionName' },
  { title: '开始时间', dataIndex: 'startTime', key: 'startTime', width: 180 },
  { title: '结束时间', dataIndex: 'endTime', key: 'endTime', width: 180 },
  { title: '状态', dataIndex: 'status', key: 'status', slot: 'status', width: 120 },
  { title: '操作', dataIndex: 'action', key: 'action', slot: 'action', width: 120 },
];

const handleOpen = (row: any) => {
  const procInsId = row?.processInstanceId || row?.id;
  if (!procInsId) {
    return;
  }
  router.push({
    path: `/bpm/instance/${procInsId}/form`,
  });
};

const getActions = (row: any) => getRowActions('my', row, {
  handleOpen,
});
</script>
