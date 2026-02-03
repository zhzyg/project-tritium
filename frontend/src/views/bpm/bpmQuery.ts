/**
 * bpmQuery.ts
 * Unified query parameter construction and enforcement.
 */

export interface BpmListFilters {
  keyword?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
}

export interface BpmListQuery extends BpmListFilters {
  pageNo: number;
  pageSize: number;
  [key: string]: any;
}

/**
 * Cleans the query object by removing empty, null, or undefined fields.
 * Ensures data types and formats are consistent.
 */
export function buildBpmQuery(rawQuery: Partial<BpmListQuery>): BpmListQuery {
  const query: any = {
    pageNo: rawQuery.pageNo || 1,
    pageSize: rawQuery.pageSize || 10,
  };

  if (rawQuery.keyword && rawQuery.keyword.trim()) {
    query.keyword = rawQuery.keyword.trim();
  }

  if (rawQuery.status !== undefined && rawQuery.status !== null && rawQuery.status !== '') {
    query.status = String(rawQuery.status);
  }

  if (rawQuery.startTime) {
    query.startTime = rawQuery.startTime;
  }

  if (rawQuery.endTime) {
    query.endTime = rawQuery.endTime;
  }

  // Support for additional parameters if needed (e.g., assignee)
  Object.keys(rawQuery).forEach(key => {
    if (!['pageNo', 'pageSize', 'keyword', 'status', 'startTime', 'endTime'].includes(key)) {
      if (rawQuery[key] !== undefined && rawQuery[key] !== null && rawQuery[key] !== '') {
        query[key] = rawQuery[key];
      }
    }
  });

  return query;
}
