import { defHttp } from '/@/utils/http/axios';

enum Api {
  Latest = '/form/schema/latest',
  Submit = '/form/data/submit',
  Page = '/form/data/page',
  Get = '/form/data/get',
}

export interface FormSchemaLatestResp {
  formKey: string;
  version: number;
  schemaJson: string;
  savedTime?: string;
}

export interface FormRecordSubmitReq {
  formKey: string;
  dataJson: string;
}

export interface FormRecordSubmitResp {
  recordId: string;
  formKey: string;
  schemaVersion: number;
  savedTime?: string;
}

export interface FormRecordPageResp {
  id: string;
  schemaVersion: number;
  createdBy?: string;
  createdTime?: string;
  dataJson?: string;
}

export const getLatestSchema = (params: { formKey: string }) =>
  defHttp.get<FormSchemaLatestResp>({ url: Api.Latest, params });

export const submitRecord = (params: FormRecordSubmitReq) =>
  defHttp.post<FormRecordSubmitResp>({ url: Api.Submit, params });

export const pageRecords = (params: { formKey: string; pageNo: number; pageSize: number }) =>
  defHttp.get<{ records: FormRecordPageResp[]; total: number }>({ url: Api.Page, params });

export const getRecord = (params: { id: string }) => defHttp.get<FormRecordPageResp>({ url: Api.Get, params });
