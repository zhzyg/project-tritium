import { defHttp } from '/@/utils/http/axios';

enum Api {
  GetLatestPublished = '/form/schema/latestPublished',
  GetDataPage = '/form/data/page',
  GetData = '/form/data/get',
  Delete = '/form/data/delete',
}

export const getLatestPublishedSchema = (params: { formKey: string }) =>
  defHttp.get({ url: Api.GetLatestPublished, params });

export const getFormDataPage = (params: { formKey: string; pageNo?: number; pageSize?: number; [key: string]: any }) =>
  defHttp.get({ url: Api.GetDataPage, params });

export const getFormData = (params: { id: string }) =>
  defHttp.get({ url: Api.GetData, params });

export const deleteFormData = (params: { formKey: string; recordIds: string[] }) =>
  defHttp.post({ url: Api.Delete, params });
