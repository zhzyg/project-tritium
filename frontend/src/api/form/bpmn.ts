import { defHttp } from '/@/utils/http/axios';

enum Api {
  Get = '/form/bpmn/get',
  Save = '/form/bpmn/save',
  Publish = '/form/bpmn/publish',
}

export interface FormBpmnGetResp {
  formKey: string;
  bpmnXml?: string;
  bpmnHash?: string;
  status?: string;
  procDefKey?: string;
  procDefId?: string;
  deploymentId?: string;
  publishedTime?: string;
  updatedTime?: string;
  version?: number;
}

export interface FormBpmnSaveReq {
  formKey: string;
  bpmnXml: string;
}

export interface FormBpmnSaveResp {
  formKey: string;
  status: string;
  bpmnHash?: string;
  updatedTime?: string;
}

export interface FormBpmnPublishResp {
  formKey: string;
  procDefKey: string;
  procDefId: string;
  deploymentId: string;
  version?: number;
  publishedTime?: string;
}

export const getFormBpmn = (params: { formKey: string }) =>
  defHttp.get<FormBpmnGetResp>({ url: Api.Get, params });

export const saveFormBpmn = (params: FormBpmnSaveReq) =>
  defHttp.post<FormBpmnSaveResp>({ url: Api.Save, params });

export const publishFormBpmn = (params: { formKey: string }) =>
  defHttp.post<FormBpmnPublishResp>({ url: Api.Publish, params });
