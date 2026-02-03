export interface BpmAction {
  key: string;
  label: string;
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'link';
  danger?: boolean;
  visible?: boolean;
  onClick: (row: any) => void;
}

export interface ActionHandlers {
  handleOpen: (row: any) => void;
  handleClaim?: (row: any) => void;
  handleApprove?: (row: any) => void;
  handleReject?: (row: any) => void;
  handleVars?: (row: any) => void;
}

export function getRowActions(
  scene: 'my' | 'tasks' | 'done',
  row: any,
  handlers: ActionHandlers
): BpmAction[] {
  const actions: BpmAction[] = [];

  if (scene === 'my') {
    actions.push({
      key: 'detail',
      label: '详情',
      type: 'link',
      visible: true,
      onClick: handlers.handleOpen,
    });
  } else if (scene === 'done') {
    actions.push({
      key: 'open',
      label: 'Open',
      type: 'link',
      visible: true,
      onClick: handlers.handleOpen,
    });
  } else if (scene === 'tasks') {
    // Logic from tasks/index.vue
    const isUnclaimed = !row.assignee;
    
    actions.push({
      key: 'claim',
      label: 'Claim',
      type: 'primary',
      visible: isUnclaimed,
      onClick: handlers.handleClaim!,
    });
    
    actions.push({
      key: 'approve',
      label: 'Approve',
      type: 'success',
      visible: !isUnclaimed,
      onClick: handlers.handleApprove!,
    });
    
    actions.push({
      key: 'reject',
      label: 'Reject',
      type: 'danger',
      visible: !isUnclaimed,
      onClick: handlers.handleReject!,
    });
    
    actions.push({
      key: 'openForm',
      label: 'Open Form',
      type: 'link',
      visible: true,
      onClick: handlers.handleOpen,
    });
    
    actions.push({
      key: 'vars',
      label: 'Vars',
      type: 'link',
      visible: true,
      onClick: handlers.handleVars!,
    });
  }

  return actions.filter(a => a.visible !== false);
}
