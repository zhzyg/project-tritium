import { defHttp } from '/@/utils/http/axios';

enum Api {
  DefList = '/bpm/defs/list',
  DefRegister = '/bpm/defs/register',
  BindSetDefault = '/bpm/bind/setDefault',
  StartByForm = '/bpm/process/startByForm',
  ProcessStatus = '/bpm/process/status',
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
