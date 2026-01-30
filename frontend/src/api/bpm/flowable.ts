import { defHttp } from '/@/utils/http/axios';

enum Api {
  DefList = '/bpm/defs/list',
  DefRegister = '/bpm/defs/register',
  BindSetDefault = '/bpm/bind/setDefault',
  StartByForm = '/bpm/process/startByForm',
  ProcessStatus = '/bpm/process/status',
  TaskList = '/bpm/task/list',
  TaskClaim = '/bpm/task/claim',
  TaskComplete = '/bpm/task/complete',
  ProcessVars = '/bpm/process/vars',
}

export interface ProcessDefItem {
  processKey: string;
  name?: string;
  category?: string;
  enabled?: number;
  isDefault?: number;
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
}


export const listTasks = (params: TaskQueryReq) =>
  defHttp.post<TaskItem[]>({ url: Api.TaskList, params });

export const claimTask = (params: TaskClaimReq) =>
  defHttp.post({ url: Api.TaskClaim, params });

export const completeTask = (params: TaskCompleteReq) =>
  defHttp.post({ url: Api.TaskComplete, params });

export const getProcessVars = (params: { processInstanceId: string }) =>
  defHttp.post<Record<string, any>>({ url: Api.ProcessVars, params });
