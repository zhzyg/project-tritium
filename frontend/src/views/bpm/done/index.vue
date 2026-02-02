<template>
  <div class="p-4" data-testid="bpm-done-page">
    <el-card>
      <template #header>
        <div class="flex justify-between items-center">
          <span>我已处理</span>
          <el-button type="primary" @click="fetchTasks">Refresh</el-button>
        </div>
      </template>
      
      <el-table :data="tableData" v-loading="loading" style="width: 100%" border stripe>
        <el-table-column prop="taskId" label="Task ID" width="220" />
        <el-table-column prop="processName" label="Process Name" width="180" />
        <el-table-column prop="name" label="Task Name" width="180" />
        <el-table-column prop="processInstanceId" label="Proc Inst ID" width="220" />
        <el-table-column prop="endTime" label="End Time" width="180" />
        <el-table-column prop="assignee" label="Assignee" width="150" />
        
        <el-table-column label="Actions" width="120" fixed="right">
          <template #default="scope">
            <el-button
              size="small"
              @click="handleOpenForm(scope.row)"
            >
              Open
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
import { listDoneTasks } from '/@/api/bpm/flowable';

interface DoneTaskItem {
  taskId: string;
  name: string;
  processName?: string;
  processInstanceId: string;
  endTime: string;
  assignee?: string;
}

const router = useRouter();
const loading = ref(false);
const tableData = ref<DoneTaskItem[]>([]);

const fetchTasks = async () => {
  loading.value = true;
  try {
    const res = await listDoneTasks({});
    tableData.value = (res as any) || [];
  } catch (error) {
    console.error(error);
    ElMessage.error('Failed to load tasks');
  } finally {
    loading.value = false;
  }
};

const handleOpenForm = (row: DoneTaskItem) => {
  router.push({
    path: '/bpm/approve',
    query: { taskId: row.taskId }
  });
};

onMounted(() => {
  fetchTasks();
});
</script>
