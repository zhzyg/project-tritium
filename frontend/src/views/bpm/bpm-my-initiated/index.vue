<template>
  <div class="p-4" data-testid="bpm-my-page">
    <a-card title="我发起的流程" :bordered="false">
      <template #extra>
        <a-button type="primary" @click="fetchProcesses" :loading="loading">刷新</a-button>
      </template>
      
      <a-table 
        :columns="columns" 
        :data-source="tableData" 
        :loading="loading" 
        row-key="processInstanceId"
        size="middle"
        :pagination="{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'status'">
            <a-tag :color="record.status === 'RUNNING' ? 'processing' : 'success'">
              {{ record.status }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="handleOpen(record)">
              详情
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { listMyProcesses } from '/@/api/bpm/flowable';

defineOptions({ name: 'BpmMy' });

const router = useRouter();
const loading = ref(false);
const tableData = ref<any[]>([]);

const columns = [
  {
    title: '流程实例ID',
    dataIndex: 'processInstanceId',
    key: 'processInstanceId',
    width: 250,
  },
  {
    title: '流程名称',
    dataIndex: 'processName',
    key: 'processName',
  },
  {
    title: '发起时间',
    dataIndex: 'startTime',
    key: 'startTime',
    width: 180,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120,
  },
  {
    title: '操作',
    dataIndex: 'action',
    key: 'action',
    fixed: 'right',
    width: 100,
  },
];

const fetchProcesses = async () => {
  console.log('[BpmMy] fetchProcesses start');
  loading.value = true;
  try {
    const res = await listMyProcesses({});
    console.log('[BpmMy] API raw res:', res);
    
    // In JeecgBoot, defHttp usually returns the result directly.
    // If it returns an object with result/records, we handle it.
    let actualData = res;
    if (res && typeof res === 'object' && !Array.isArray(res)) {
      actualData = (res as any).result || (res as any).records || [];
    }
    
    tableData.value = Array.isArray(actualData) ? actualData : [];
    console.log('[BpmMy] tableData set to:', tableData.value);
  } catch (error: any) {
    console.error('[BpmMy] fetch error:', error);
    message.error('加载流程列表失败');
  } finally {
    loading.value = false;
  }
};

const handleOpen = (record: any) => {
  router.push({
    path: '/bpm/process/view',
    query: { procInstId: record.processInstanceId }
  });
};

onMounted(() => {
  console.log('[BpmMy] mounted');
  fetchProcesses();
});
</script>