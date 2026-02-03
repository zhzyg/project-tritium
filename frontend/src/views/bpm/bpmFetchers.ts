import { listMyProcesses, listMyTasks, listDoneTasks } from '/@/api/bpm/flowable';

export interface PageResult<T = any> {
  records: T[];
  total: number;
}

export interface ListQuery {
  pageNo: number;
  pageSize: number;
  keyword?: string;
  [key: string]: any;
}

function handleResult(res: any): PageResult {
  let records = res;
  let total = 0;

  if (res && typeof res === 'object' && !Array.isArray(res)) {
    records = res.result || res.records || [];
    total = res.total || records.length;
  } else if (Array.isArray(res)) {
    total = res.length;
  } else {
    records = [];
  }

  return { records, total };
}

export async function fetchMyInitiated(query: ListQuery): Promise<PageResult> {
  const res = await listMyProcesses(query);
  return handleResult(res);
}

export async function fetchMyTasks(query: ListQuery): Promise<PageResult> {
  const res = await listMyTasks(query);
  return handleResult(res);
}

export async function fetchMyDone(query: ListQuery): Promise<PageResult> {
  const res = await listDoneTasks(query);
  return handleResult(res);
}
