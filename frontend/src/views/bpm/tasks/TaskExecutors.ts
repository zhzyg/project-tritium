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
      message.success('认领成功');
      onRefresh();
    } catch (error: any) {
      message.error('认领失败：' + (error.message || '未知错误'));
    }
  };

  const handleApprove = async (row: any, variables?: any) => {
    try {
      const payload = {
        taskId: row.taskId,
        variables: variables || { status: 'APPROVED', reason: '', updatedAt: new Date().toISOString() }
      };
      await completeTask(payload);
      message.success('审批通过');
      // If we want to auto-open vars after approve like the current index.vue does:
      if (onOpenVars) {
        await loadVars(row);
      }
      onRefresh();
    } catch (error: any) {
      message.error('审批失败：' + (error.message || '未知错误'));
    }
  };

  const handleReject = async (row: any, reason: string) => {
    try {
      const payload = {
        taskId: row.taskId,
        variables: { status: 'REJECTED', reason, updatedAt: new Date().toISOString() }
      };
      await completeTask(payload);
      message.success('驳回成功');
      if (onOpenVars) {
        await loadVars(row);
      }
      onRefresh();
    } catch (error: any) {
      message.error('驳回失败：' + (error.message || '未知错误'));
    }
  };

  const loadVars = async (row: any) => {
    if (!row.processInstanceId) {
      message.warning('缺少流程实例ID');
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
      message.error('变量加载失败：' + (error.message || '未知错误'));
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
