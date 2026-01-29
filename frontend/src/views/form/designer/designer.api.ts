import { defHttp } from '/@/utils/http/axios';

enum Api {
  Save = '/form/schema/save',
  Latest = '/form/schema/latest',
  Versions = '/form/schema/versions',
  Publish = '/form/schema/publish',
}

export interface FormSchemaSaveReq {
  formKey: string;
  schemaJson: string;
  publish?: boolean;
}

export interface FormSchemaSaveResp {
  formKey: string;
  version: number;
  savedTime?: string;
}

export interface FormSchemaLatestResp {
  formKey: string;
  version: number;
  schemaJson: string;
  savedTime?: string;
}

export interface FormSchemaVersionResp {
  formKey: string;
  version: number;
  status: number;
  createdTime?: string;
}

export interface FormSchemaPublishResp {
  formKey: string;
  version: number;
  tableName: string;
  ddlApplied?: string[];
}

export const saveSchema = (params: FormSchemaSaveReq) => defHttp.post<FormSchemaSaveResp>({ url: Api.Save, params });

export const getLatestSchema = (params: { formKey: string }) => defHttp.get<FormSchemaLatestResp>({ url: Api.Latest, params });

export const getSchemaVersions = (params: { formKey: string }) =>
  defHttp.get<FormSchemaVersionResp[]>({ url: Api.Versions, params });

export const publishSchema = (params: { formKey: string }) =>
  defHttp.post<FormSchemaPublishResp>({ url: Api.Publish, params });
