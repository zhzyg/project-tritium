<template>
  <div class="p-4" data-testid="bpm-my-page">
    <el-card>
      <template #header>
        <div class="flex justify-between items-center">
          <span>我发起的流程</span>
          <el-button type="primary" @click="fetchProcesses">刷新</el-button>
        </div>
      </template>
      
      <el-table :data="tableData" v-loading="loading" border stripe style="width: 100%">
        <el-table-column prop="processInstanceId" label="流程实例ID" width="220" />
        <el-table-column prop="processName" label="流程名称" min-width="150" />
        <el-table-column prop="startTime" label="发起时间" width="180" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'RUNNING' ? 'primary' : 'success'">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="scope">
            <el-button link type="primary" size="small" @click="handleOpen(scope.row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { listMyProcesses } from '/@/api/bpm/flowable';

const router = useRouter();
const loading = ref(false);
const tableData = ref([]);

const fetchProcesses = async () => {
  loading.value = true;
  try {
    const res = await listMyProcesses({});
    // Ensure res is an array
    if (Array.isArray(res)) {
      tableData.value = res;
    } else {
      // If wrapped in result object (depending on axios setup)
      tableData.value = (res as any)?.result || (res as any)?.records || [];
    }
    console.log('My Processes loaded:', tableData.value);
  } catch (error) {
    console.error('Fetch error:', error);
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const handleOpen = (row: any) => {
  router.push({
    path: '/bpm/process/view',
    query: { procInstId: row.processInstanceId }
  });
};

onMounted(() => {
  console.log('BpmMyView mounted');
  fetchProcesses();
});
</script>