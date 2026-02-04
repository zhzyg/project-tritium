import { defHttp } from '/@/utils/http/axios';

enum Api {
  DefList = '/bpm/defs/list',
  DefRegister = '/bpm/defs/register',
  BindSetDefault = '/bpm/bind/setDefault',
  BindGetByProcDefKey = '/bpm/procFormBind/getByProcDefKey',
  BindUpsert = '/bpm/procFormBind/upsert',
  Start = '/bpm/process/start',
  StartByForm = '/bpm/process/startByForm',
  ProcessStatus = '/bpm/process/status',
  TaskMy = '/bpm/task/my',
  TaskClaim = '/bpm/task/claim',
  TaskComplete = '/bpm/task/complete',
  ProcessVars = '/bpm/process/vars',
  TaskContext = '/bpm/task/context',
  ProcessContext = '/bpm/process/context',
  TaskComments = '/bpm/task/comments',
  TaskDone = '/bpm/task/done',
  ProcessMy = '/bpm/process/my',
}

export interface ProcessDefItem {
  processKey: string;
  name?: string;
  category?: string;
  enabled?: number;
  isDefault?: number;
  startPermCode?: string;
  canStart?: boolean;
  missingPerm?: string;
}

export interface ProcessDefRegisterReq {
  processKey: string;
  name?: string;
  category?: string;
  enabled?: number;
  isDefault?: number;
}

export interface FormBindReq {
  formKey: string;
  processKey: string;
}

export interface ProcFormBindResp {
  processKey: string;
  formKey?: string;
  formName?: string;
  enabled?: number;
}

export interface StartProcessReq {
  processKey: string;
  formKey?: string;
  recordId?: string;
  businessKey?: string;
  assignee?: string;
}

export interface StartProcessResp {
  processInstanceId: string;
}

export interface StartByFormReq {
  formKey: string;
  recordId: string;
  assignee?: string;
}

export interface StartByFormResp {
  processInstanceId: string;
  processKey: string;
  businessKey?: string;
}

export interface ProcessStatusTaskItem {
  taskId: string;
  name?: string;
  processInstanceId?: string;
  assignee?: string;
  candidateGroups?: string[];
  createTime?: string;
}

export interface ProcessStatusResp {
  ended: boolean;
  businessKey?: string;
  currentTasks?: ProcessStatusTaskItem[];
}

export const listProcessDefs = () => defHttp.get<ProcessDefItem[]>({ url: Api.DefList });

export const registerProcessDef = (params: ProcessDefRegisterReq) =>
  defHttp.post({ url: Api.DefRegister, params });

export const setDefaultBind = (params: FormBindReq) => defHttp.post({ url: Api.BindSetDefault, params });

export const upsertProcFormBind = (params: FormBindReq) => defHttp.post({ url: Api.BindUpsert, params });

export const getProcFormBind = (params: { procDefKey?: string; processKey?: string }) =>
  defHttp.get<ProcFormBindResp | null>({ url: Api.BindGetByProcDefKey, params });

export const startProcess = (params: StartProcessReq) =>
  defHttp.post<StartProcessResp>({ url: Api.Start, params });

export const startByForm = (params: StartByFormReq) => defHttp.post<StartByFormResp>({ url: Api.StartByForm, params });

export const getProcessStatus = (params: { processInstanceId: string }) =>
  defHttp.get<ProcessStatusResp>({ url: Api.ProcessStatus, params });


export interface TaskQueryReq {
  assignee?: string;
  candidateGroup?: string;
  processInstanceId?: string;
}

export interface TaskItem {
  taskId: string;
  name?: string;
  processName?: string;
  assignee?: string;
  createTime?: string;
  processInstanceId?: string;
  processDefinitionId?: string;
}

export interface TaskClaimReq {
  taskId: string;
}

export interface TaskCompleteReq {
  taskId: string;
  variables?: Record<string, any>;
  comment?: string;
}


export const listMyTasks = (params: TaskQueryReq) =>
  defHttp.get<TaskItem[]>({ url: Api.TaskMy, params });

export const claimTask = (params: TaskClaimReq) =>
  defHttp.post({ url: Api.TaskClaim, params });

export const completeTask = (params: TaskCompleteReq) =>
  defHttp.post({ url: Api.TaskComplete, params });

export const getProcessVars = (params: { processInstanceId: string }) =>
  defHttp.post<Record<string, any>>({ url: Api.ProcessVars, params });

export interface TaskContextResp {
  taskId: string;
  processInstanceId: string;
  businessKey?: string;
  recordId?: string;
  formKey?: string;
  schemaVersion?: number;
  taskName?: string;
  processName?: string;
  assignee?: string;
  createTime?: string;
  candidateGroups?: string[];
}

export const getTaskContext = (params: { taskId: string }) =>
  defHttp.get<TaskContextResp>({ url: Api.TaskContext, params });

export const getProcessContext = (params: { processInstanceId: string }) =>
  defHttp.get<TaskContextResp>({ url: Api.ProcessContext, params });

export interface ProcessTraceItem {
  time: string;
  type: string;
  taskId?: string;
  taskName?: string;
  assignee?: string;
  comment?: string;
}

export const getProcessTrace = (params: { procInstId: string }) =>
  defHttp.get<ProcessTraceItem[]>({ url: '/bpm/process/trace', params });

export interface TaskCommentItem {
   id: string;
   userId: string;
   time: string;
   message: string;
}

export const getTaskComments = (params: { taskId: string }) =>
    defHttp.get<TaskCommentItem[]>({ url: Api.TaskComments, params });

export interface HistoricTaskItem {
    taskId: string;
    name: string;
    processName?: string;
    processInstanceId: string;
    endTime: string;
    assignee?: string;
    claimTime?: string;
    duration?: number;
}

export const listDoneTasks = (params: TaskQueryReq) =>
    defHttp.get<HistoricTaskItem[]>({ url: Api.TaskDone, params });

export interface MyProcessItem {
    processInstanceId: string;
    processName?: string;
    startTime: string;
    status: string;
}

export const listMyProcesses = (params: TaskQueryReq) =>
    defHttp.get<MyProcessItem[]>({ url: Api.ProcessMy, params });
