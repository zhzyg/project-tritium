<template>
  <BpmListPage
    title="我的待办"
    test-id="bpm-tasks-page"
    :columns="columns"
    :fetch-page="fetchMyTasks"
    ref="listPageRef"
  >
    <template #groups="{ row }">
      <el-tag v-for="group in row.candidateGroups" :key="group" style="margin-right: 5px;">{{ group }}</el-tag>
    </template>
    <template #status="{ row }">
      <el-tag :type="row.assignee ? 'success' : 'warning'">{{ row.assignee ? 'Claimed' : 'Unclaimed' }}</el-tag>
    </template>
    <template #action="{ row }">
      <el-button
        type="primary"
        size="small"
        v-if="!row.assignee"
        @click="handleClaim(row)"
      >
        Claim
      </el-button>
      <el-button
        type="success"
        size="small"
        v-else
        @click="handleApprove(row)"
      >
        Approve
      </el-button>
      <el-button
        type="danger"
        size="small"
        v-if="row.assignee"
        @click="handleReject(row)"
      >
        Reject
      </el-button>
      <el-button
        size="small"
        @click="handleOpenForm(row)"
      >
        Open Form
      </el-button>
      <el-button
        size="small"
        @click="handleVars(row)"
      >
        Vars
      </el-button>
    </template>
  </BpmListPage>

  <el-dialog v-model="varsVisible" title="Process Variables" width="50%">
    <div v-loading="varsLoading">
      <pre v-if="varsData">{{ JSON.stringify(varsData, null, 2) }}</pre>
      <el-empty v-else description="No variables found" />
    </div>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import BpmListPage from '../_components/BpmListPage.vue';
import { fetchMyTasks } from '../bpmFetchers';
import { claimTask, completeTask, getProcessVars } from '/@/api/bpm/flowable';

const router = useRouter();
const listPageRef = ref();

const varsVisible = ref(false);
const varsLoading = ref(false);
const varsData = ref<any>(null);

const columns = [
  { label: 'Task ID', prop: 'taskId', minWidth: 220 },
  { label: 'Process Name', prop: 'processName', minWidth: 180 },
  { label: 'Task Name', prop: 'name', minWidth: 180 },
  { label: 'Proc Inst ID', prop: 'processInstanceId', minWidth: 220 },
  { label: 'Create Time', prop: 'createTime', minWidth: 180 },
  { label: 'Assignee', prop: 'assignee', minWidth: 150 },
  { label: 'Candidate Groups', prop: 'candidateGroups', minWidth: 200, slot: 'groups' },
  { label: 'Status', prop: 'status', minWidth: 100, slot: 'status' },
  { label: 'Actions', prop: 'action', minWidth: 280, slot: 'action' },
];

const refresh = () => listPageRef.value?.loadData();

const handleClaim = async (row: any) => {
  try {
    await claimTask({ taskId: row.taskId });
    ElMessage.success('Claimed successfully');
    refresh();
  } catch (error) {
    console.error(error);
    ElMessage.error('Claim failed');
  }
};

const handleApprove = async (row: any) => {
  try {
    await completeTask({
      taskId: row.taskId,
      variables: { status: 'APPROVED', reason: '', updatedAt: new Date().toISOString() }
    });
    ElMessage.success('Approved successfully');
    await handleVars(row);
    refresh();
  } catch (error) {
    console.error(error);
    ElMessage.error('Approve failed');
  }
};

const handleReject = async (row: any) => {
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
    refresh();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error(error);
      ElMessage.error('Reject failed');
    }
  }
};

const handleOpenForm = (row: any) => {
  router.push({
    path: '/bpm/approve',
    query: { taskId: row.taskId }
  });
};

const handleVars = async (row: any) => {
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
</script>