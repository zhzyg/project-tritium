import { listMyProcesses, listMyTasks, listDoneTasks } from '/@/api/bpm/flowable';
import { buildBpmQuery, BpmListQuery } from './bpmQuery';

export interface PageResult<T = any> {
  records: T[];
  total: number;
}

function handleResult(res: any): PageResult {
  let records = res;
  let total = 0;

  if (res && typeof res === 'object' && !Array.isArray(res)) {
    // Handle Jeecg standard result structure
    records = res.result?.records || res.result || res.records || [];
    total = res.result?.total || res.total || (Array.isArray(records) ? records.length : 0);
  } else if (Array.isArray(res)) {
    total = res.length;
  } else {
    records = [];
  }

  return { records, total };
}

export async function fetchMyInitiated(query: Partial<BpmListQuery>): Promise<PageResult> {
  const cleanQuery = buildBpmQuery(query);
  const res = await listMyProcesses(cleanQuery);
  return handleResult(res);
}

export async function fetchMyTasks(query: Partial<BpmListQuery>): Promise<PageResult> {
  const cleanQuery = buildBpmQuery(query);
  const res = await listMyTasks(cleanQuery);
  return handleResult(res);
}

export async function fetchMyDone(query: Partial<BpmListQuery>): Promise<PageResult> {
  const cleanQuery = buildBpmQuery(query);
  const res = await listDoneTasks(cleanQuery);
  return handleResult(res);
}
