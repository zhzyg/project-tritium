<template>
  <div class="p-4">
    <el-card>
      <template #header>
        <div class="flex justify-between items-center">
          <span>我发起的</span>
          <el-button type="primary" @click="fetchProcesses">Refresh</el-button>
        </div>
      </template>
      
      <el-table :data="tableData" v-loading="loading" style="width: 100%" border stripe>
        <el-table-column prop="processInstanceId" label="Proc Inst ID" width="220" />
        <el-table-column prop="processName" label="Process Name" width="180" />
        <el-table-column prop="startTime" label="Start Time" width="180" />
        <el-table-column prop="status" label="Status" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'RUNNING' ? 'primary' : 'success'">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="Actions" width="120" fixed="right">
          <template #default="scope">
            <el-button
              size="small"
              @click="handleOpen(scope.row)"
            >
              View
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

interface MyProcessItem {
  processInstanceId: string;
  processName?: string;
  startTime: string;
  status: string;
}

const router = useRouter();
const loading = ref(false);
const tableData = ref<MyProcessItem[]>([]);

const fetchProcesses = async () => {
  loading.value = true;
  try {
    const res = await listMyProcesses({});
    tableData.value = (res as any) || [];
  } catch (error) {
    console.error(error);
    ElMessage.error('Failed to load processes');
  } finally {
    loading.value = false;
  }
};

const handleOpen = (row: MyProcessItem) => {
  router.push({
    path: '/bpm/process/view',
    query: { procInstId: row.processInstanceId }
  });
};

onMounted(() => {
  fetchProcesses();
});
</script>
