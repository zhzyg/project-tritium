<template>
  <div class="p-4">
    <el-card>
      <template #header>
        <div class="flex justify-between items-center">
          <span>我的待办</span>
          <el-button type="primary" @click="fetchTasks">Refresh</el-button>
        </div>
      </template>
      
      <el-table :data="tableData" v-loading="loading" style="width: 100%" border stripe>
        <el-table-column prop="taskId" label="Task ID" width="220" />
        <el-table-column prop="name" label="Name" width="180" />
        <el-table-column prop="processInstanceId" label="Proc Inst ID" width="220" />
        <el-table-column prop="createTime" label="Create Time" width="180" />
        <el-table-column prop="assignee" label="Assignee" width="150" />
        
        <el-table-column label="Actions" width="280" fixed="right">
          <template #default="scope">
            <el-button 
              type="primary" 
              size="small" 
              v-if="!scope.row.assignee" 
              @click="handleClaim(scope.row)"
            >
              Claim
            </el-button>
            <el-button
              type="success"
              size="small"
              v-else
              @click="handleApprove(scope.row)"
            >
              Approve
            </el-button>
            <el-button
              type="danger"
              size="small"
              v-if="scope.row.assignee"
              @click="handleReject(scope.row)"
            >
              Reject
            </el-button>
            <el-button
              size="small"
              @click="handleOpenForm(scope.row)"
            >
              Open Form
            </el-button>
            <el-button
              size="small"
              @click="handleVars(scope.row)"
            >
              Vars
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="varsVisible" title="Process Variables" width="50%">
      <div v-loading="varsLoading">
        <pre v-if="varsData">{{ JSON.stringify(varsData, null, 2) }}</pre>
        <el-empty v-else description="No variables found" />
      </div>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { listMyTasks, claimTask, completeTask, getProcessVars, getTaskContext } from '/@/api/bpm/flowable';

// Simple interface matching the API
interface TaskItem {
  taskId: string;
  name: string;
  processInstanceId: string;
  createTime: string;
  assignee?: string;
}

const router = useRouter();
const loading = ref(false);
const tableData = ref<TaskItem[]>([]);
const varsVisible = ref(false);
const varsLoading = ref(false);
const varsData = ref<any>(null);

const fetchTasks = async () => {
  loading.value = true;
  try {
    const res = await listMyTasks({});
    tableData.value = (res as any) || [];
  } catch (error) {
    console.error(error);
    ElMessage.error('Failed to load tasks');
  } finally {
    loading.value = false;
  }
};

const handleClaim = async (row: TaskItem) => {
  try {
    await claimTask({ taskId: row.taskId });
    ElMessage.success('Claimed successfully');
    fetchTasks();
  } catch (error) {
    console.error(error);
    ElMessage.error('Claim failed');
  }
};

const handleApprove = async (row: TaskItem) => {
  try {
    await completeTask({
      taskId: row.taskId,
      variables: { status: 'APPROVED', reason: '', updatedAt: new Date().toISOString() }
    });
    ElMessage.success('Approved successfully');
    await handleVars(row);
    fetchTasks();
  } catch (error) {
    console.error(error);
    ElMessage.error('Approve failed');
  }
};

const handleReject = async (row: TaskItem) => {
  try {
    const { value } = await ElMessageBox.prompt('Please input reject reason', 'Reject', {
      confirmButtonText: 'OK',
      cancelButtonText: 'Cancel',
      inputPattern: /\S+/,
      inputErrorMessage: 'Reason is required',
    });
    
    await completeTask({
      taskId: row.taskId,
      variables: { status: 'REJECTED', reason: value, updatedAt: new Date().toISOString() }
    });
    ElMessage.success('Rejected successfully');
    await handleVars(row);
    fetchTasks();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error(error);
      ElMessage.error('Reject failed');
    }
  }
};

const handleOpenForm = async (row: TaskItem) => {
  try {
    const res = await getTaskContext({ taskId: row.taskId });
    if (res && res.recordId) {
      router.push({
        name: 'FormRuntime',
        query: {
          formKey: res.formKey,
          recordId: res.recordId,
        },
      });
    } else {
      ElMessage.error('No record bound to this task');
    }
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || 'Failed to open form');
  }
};

const handleVars = async (row: TaskItem) => {
  if (!row.processInstanceId) {
    ElMessage.warning('No Process Instance ID');
    return;
  }
  varsVisible.value = true;
  varsLoading.value = true;
  varsData.value = null;
  try {
    const res = await getProcessVars({ processInstanceId: row.processInstanceId });
    varsData.value = res;
  } catch (error) {
    console.error(error);
    ElMessage.error('Failed to load variables');
  } finally {
    varsLoading.value = false;
  }
};

onMounted(() => {
  fetchTasks();
});
</script>
