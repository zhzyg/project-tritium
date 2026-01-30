import { defHttp } from '/@/utils/http/axios';

enum Api {
  Latest = '/form/schema/latest',
  LatestPublished = '/form/schema/latestPublished',
  Submit = '/form/data/submit',
  Insert = '/form/data/insert',
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

export interface FormRecordInsertReq {
  formKey: string;
  data: Record<string, any>;
  recordId?: string;
}

export interface FormRecordInsertResp {
  recordId: string;
  formKey: string;
  schemaVersion: number;
  createdTime?: string;
}

export interface FormRecordPageResp {
  id: string;
  recordId?: string;
  schemaVersion: number;
  createdBy?: string;
  createdTime?: string;
  dataJson?: string;
  data?: Record<string, any>;
}

export const getLatestSchema = (params: { formKey: string }) =>
  defHttp.get<FormSchemaLatestResp>({ url: Api.Latest, params });

export interface FormSchemaFieldMetaResp {
  fieldKey: string;
  label?: string;
  widgetType?: string;
  dbColumn?: string;
  dbType?: string;
  dbLength?: number;
  nullable?: number;
  searchable?: number;
}

export interface FormSchemaPublishedResp {
  formKey: string;
  version: number;
  tableName: string;
  fieldMetas?: FormSchemaFieldMetaResp[];
}

export const getLatestPublishedSchema = (params: { formKey: string }) =>
  defHttp.get<FormSchemaPublishedResp>({ url: Api.LatestPublished, params });

export const submitRecord = (params: FormRecordSubmitReq) =>
  defHttp.post<FormRecordSubmitResp>({ url: Api.Submit, params });

export const insertRecord = (params: FormRecordInsertReq) =>
  defHttp.post<FormRecordInsertResp>({ url: Api.Insert, params });

export const pageRecords = (params: { formKey: string; pageNo: number; pageSize: number; sortBy?: string; sort?: string } & Record<string, any>) =>
  defHttp.get<{ records: FormRecordPageResp[]; total: number }>({ url: Api.Page, params });

export const getRecord = (params: { id: string }) => defHttp.get<FormRecordPageResp>({ url: Api.Get, params });
