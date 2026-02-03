import { message } from 'ant-design-vue';
import { claimTask, completeTask, getProcessVars } from '/@/api/bpm/flowable';

export interface TaskExecutorDeps {
  onRefresh: () => void;
  onOpenVars?: (row: any, data: any) => void;
  setVarsLoading?: (loading: boolean) => void;
}

export function createTaskExecutors(deps: TaskExecutorDeps) {
  const { onRefresh, onOpenVars, setVarsLoading } = deps;

  const handleClaim = async (row: any) => {
    try {
      await claimTask({ taskId: row.taskId });
      message.success('Claimed successfully');
      onRefresh();
    } catch (error: any) {
      message.error('Claim failed: ' + (error.message || 'Unknown error'));
    }
  };

  const handleApprove = async (row: any, variables?: any) => {
    try {
      const payload = {
        taskId: row.taskId,
        variables: variables || { status: 'APPROVED', reason: '', updatedAt: new Date().toISOString() }
      };
      await completeTask(payload);
      message.success('Approved successfully');
      // If we want to auto-open vars after approve like the current index.vue does:
      if (onOpenVars) {
        await loadVars(row);
      }
      onRefresh();
    } catch (error: any) {
      message.error('Approve failed: ' + (error.message || 'Unknown error'));
    }
  };

  const handleReject = async (row: any, reason: string) => {
    try {
      const payload = {
        taskId: row.taskId,
        variables: { status: 'REJECTED', reason, updatedAt: new Date().toISOString() }
      };
      await completeTask(payload);
      message.success('Rejected successfully');
      if (onOpenVars) {
        await loadVars(row);
      }
      onRefresh();
    } catch (error: any) {
      message.error('Reject failed: ' + (error.message || 'Unknown error'));
    }
  };

  const loadVars = async (row: any) => {
    if (!row.processInstanceId) {
      message.warning('No Process Instance ID');
      return;
    }
    try {
      if (setVarsLoading) setVarsLoading(true);
      const res = await getProcessVars({ processInstanceId: row.processInstanceId });
      if (onOpenVars) {
        onOpenVars(row, res);
      }
      return res;
    } catch (error: any) {
      message.error('Failed to load variables: ' + (error.message || 'Unknown error'));
    } finally {
      if (setVarsLoading) setVarsLoading(false);
    }
  };

  return {
    handleClaim,
    handleApprove,
    handleReject,
    loadVars,
  };
}