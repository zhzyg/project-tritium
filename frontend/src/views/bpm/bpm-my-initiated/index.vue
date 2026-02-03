<template>
  <BpmListPage
    title="我发起的流程"
    test-id="bpm-my-page"
    :columns="columns"
    :fetch-page="fetchMyInitiated"
  >
    <template #status="{ row }">
      <el-tag :type="row.status === 'RUNNING' ? 'primary' : 'success'">
        {{ row.status }}
      </el-tag>
    </template>
    <template #action="{ row }">
      <el-button link type="primary" @click="handleOpen(row)">详情</el-button>
    </template>
  </BpmListPage>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';
import BpmListPage from '../_components/BpmListPage.vue';
import { fetchMyInitiated } from '../bpmFetchers';

defineOptions({ name: 'BpmMy' });

const router = useRouter();

const columns = [
  { label: '流程实例ID', prop: 'processInstanceId', minWidth: 250 },
  { label: '流程名称', prop: 'processName', minWidth: 150 },
  { label: '发起时间', prop: 'startTime', minWidth: 180 },
  { label: '状态', prop: 'status', minWidth: 120, slot: 'status' },
  { label: '操作', prop: 'action', minWidth: 100, slot: 'action' },
];

const handleOpen = (row: any) => {
  router.push({
    path: '/bpm/process/view',
    query: { procInstId: row.processInstanceId }
  });
};
</script>
