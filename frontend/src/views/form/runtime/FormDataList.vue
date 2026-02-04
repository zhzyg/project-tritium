<template>
  <div class="p-4">
    <a-card :title="formTitle" :bordered="false">
      <template #extra>
        <a-button type="primary" @click="loadData" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </template>

      <!-- Search Bar -->
      <a-form layout="inline" class="mb-4">
        <a-form-item label="关键字">
          <a-input v-model:value="keyword" placeholder="搜索关键词" allow-clear @pressEnter="handleSearch" />
        </a-form-item>
        <a-form-item label="创建时间">
          <a-range-picker
            v-model:value="timeRange"
            :show-time="{ format: 'HH:mm:ss' }"
            valueFormat="YYYY-MM-DD HH:mm:ss"
            @change="handleTimeChange"
          />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="handleSearch">查询</a-button>
          <a-button style="margin-left: 8px" @click="handleReset">重置</a-button>
        </a-form-item>
      </a-form>

      <div class="mb-3 flex flex-wrap items-center gap-2">
        <a-button @click="openColumnSettings">
          <template #icon><SettingOutlined /></template>
          列设置
        </a-button>
        <a-button @click="handleExport">
          <template #icon><DownloadOutlined /></template>
          导出 CSV
        </a-button>
        <a-button danger :disabled="!selectedRowKeys.length" @click="handleDelete">
          <template #icon><DeleteOutlined /></template>
          删除
        </a-button>
      </div>

      <!-- Table -->
      <a-table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        row-key="id"
        size="middle"
        :pagination="pagination"
        :row-selection="rowSelection"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <a-button type="link" size="small" @click="handleView(record)">查看</a-button>
          </template>
        </template>
      </a-table>

      <a-modal v-model:open="columnSettingsVisible" title="列设置" @ok="handleColumnSettingsOk">
        <a-checkbox-group v-model:value="selectedSystemCols" :options="systemColumnOptions" />
        <div class="text-sm text-gray-500 mt-2">
          仅控制系统列显示/隐藏（record_id/created_by/created_time）。
        </div>
      </a-modal>
    </a-card>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ReloadOutlined, SettingOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import { Modal } from 'ant-design-vue';
import { useMessage } from '/@/hooks/web/useMessage';
import { getLatestPublishedSchema, getFormDataPage, deleteFormData } from '/@/api/form/engine';

const route = useRoute();
const router = useRouter();
const { createMessage } = useMessage();

const formKey = computed(() => route.params.formKey as string);
const formTitle = ref('表单数据');
const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const keyword = ref('');
const selectedRowKeys = ref<string[]>([]);
const selectedRows = ref<any[]>([]);
const timeRange = ref<any[]>([]);
const fieldMetas = ref<any[]>([]);
const columnSettingsVisible = ref(false);
const selectedSystemCols = ref<string[]>([]);
const systemColumnOptions = [
  { label: '记录ID', value: 'recordId' },
  { label: '创建人', value: 'createdBy' },
  { label: '创建时间', value: 'createdTime' },
];
const columnSettings = ref({
  recordId: true,
  createdBy: true,
  createdTime: true,
});
const columns = ref<any[]>([
  { title: '记录ID', dataIndex: 'id', key: 'id', width: 200 },
  { title: '创建人', dataIndex: 'createdBy', key: 'createdBy' },
  { title: '创建时间', dataIndex: 'createdTime', key: 'createdTime' },
]);

const query = reactive({
  pageNo: 1,
  pageSize: 10,
  startTime: '',
  endTime: '',
});

const pagination = computed(() => ({
  current: query.pageNo,
  pageSize: query.pageSize,
  total: total.value,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (t: number) => `共 ${t} 条`,
}));

const rowSelection = computed(() => {
  return {
    selectedRowKeys: selectedRowKeys.value,
    onChange: (keys: string[], rows: any[]) => {
      selectedRowKeys.value = keys;
      selectedRows.value = rows || [];
    },
  };
});

const columnSettingsKey = computed(() => `tritium:formCols:${formKey.value || 'unknown'}`);

const resolveRecordId = (record: any) => {
  return record?.recordId || record?.id || record?.record_id || '';
};

const loadColumnSettings = () => {
  try {
    const raw = localStorage.getItem(columnSettingsKey.value);
    if (raw) {
      const parsed = JSON.parse(raw);
      columnSettings.value = {
        recordId: parsed?.recordId !== false,
        createdBy: parsed?.createdBy !== false,
        createdTime: parsed?.createdTime !== false,
      };
    }
  } catch (e) {
    // ignore malformed storage
  }
  selectedSystemCols.value = Object.keys(columnSettings.value).filter(
    (key) => (columnSettings.value as any)[key]
  );
};

const buildColumns = () => {
  const dynamicCols = fieldMetas.value.map((m: any) => ({
    title: m.label || m.fieldKey,
    dataIndex: ['data', m.fieldKey],
    key: m.fieldKey,
  }));
  const systemCols = [];
  if (columnSettings.value.recordId) {
    systemCols.push({ title: '记录ID', dataIndex: 'recordId', key: 'recordId', width: 200 });
  }
  if (columnSettings.value.createdBy) {
    systemCols.push({ title: '创建人', dataIndex: 'createdBy', key: 'createdBy', width: 140 });
  }
  if (columnSettings.value.createdTime) {
    systemCols.push({ title: '创建时间', dataIndex: 'createdTime', key: 'createdTime', width: 180 });
  }
  columns.value = [
    ...dynamicCols,
    ...systemCols,
    { title: '操作', key: 'action', fixed: 'right', width: 100 },
  ];
};

const openColumnSettings = () => {
  selectedSystemCols.value = Object.keys(columnSettings.value).filter(
    (key) => (columnSettings.value as any)[key]
  );
  columnSettingsVisible.value = true;
};

const handleColumnSettingsOk = () => {
  const selected = new Set(selectedSystemCols.value);
  columnSettings.value = {
    recordId: selected.has('recordId'),
    createdBy: selected.has('createdBy'),
    createdTime: selected.has('createdTime'),
  };
  try {
    localStorage.setItem(columnSettingsKey.value, JSON.stringify(columnSettings.value));
  } catch (e) {
    // ignore storage failures
  }
  buildColumns();
  columnSettingsVisible.value = false;
};

const loadSchema = async () => {
  if (!formKey.value) return;
  try {
    const res = await getLatestPublishedSchema({ formKey: formKey.value });
    if (res && res.fieldMetas) {
      formTitle.value = res.formTitle || formKey.value;
      fieldMetas.value = res.fieldMetas || [];
      buildColumns();
    }
  } catch (e: any) {
    createMessage.error('加载表单定义失败: ' + e.message);
  }
};

const loadData = async () => {
  if (!formKey.value) return;
  loading.value = true;
  try {
    const params: any = {
      formKey: formKey.value,
      pageNo: query.pageNo,
      pageSize: query.pageSize,
    };
    if (keyword.value) {
      params.q_keyword = keyword.value;
    }
    if (query.startTime) {
      params.startTime = query.startTime;
    }
    if (query.endTime) {
      params.endTime = query.endTime;
    }
    const res = await getFormDataPage(params);
    tableData.value = (res.records || []).map((row: any) => ({
      ...row,
      id: row.id || row.recordId || row.record_id,
    }));
    total.value = res.total || 0;
    const keySet = new Set(tableData.value.map((row) => String(resolveRecordId(row))));
    const nextKeys = selectedRowKeys.value.filter((key) => keySet.has(String(key)));
    selectedRowKeys.value = nextKeys;
    selectedRows.value = tableData.value.filter((row) => nextKeys.includes(String(resolveRecordId(row))));
  } catch (e: any) {
    createMessage.error('数据加载失败: ' + e.message);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  query.pageNo = 1;
  loadData();
};

const handleReset = () => {
  keyword.value = '';
  query.startTime = '';
  query.endTime = '';
  timeRange.value = [];
  query.pageNo = 1;
  loadData();
};

const handleTableChange = (pag: any) => {
  query.pageNo = pag.current;
  query.pageSize = pag.pageSize;
  loadData();
};

const handleTimeChange = (dates: any[], dateStrings: string[]) => {
  if (dates) {
    query.startTime = dateStrings[0];
    query.endTime = dateStrings[1];
  } else {
    query.startTime = '';
    query.endTime = '';
  }
  handleSearch();
};

const handleView = (record: any) => {
  const recordId = resolveRecordId(record);
  if (!recordId) {
    createMessage.warning('未找到记录ID');
    return;
  }
  router.push({
    path: `/form/runtime/${formKey.value}/view`,
    query: { recordId },
  });
};

const escapeCsv = (value: any) => {
  const text = value === null || value === undefined ? '' : String(value);
  const escaped = text.replace(/\"/g, '""');
  if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
    return `"${escaped}"`;
  }
  return escaped;
};

const getCellValue = (record: any, dataIndex: any) => {
  if (Array.isArray(dataIndex)) {
    return dataIndex.reduce((acc, key) => (acc ? acc[key] : undefined), record);
  }
  return record?.[dataIndex];
};

const formatCsvValue = (value: any) => {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value) || typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  }
  return String(value);
};

const handleExport = () => {
  const rows = selectedRows.value.length ? selectedRows.value : tableData.value;
  if (!rows.length) {
    createMessage.warning('无数据可导出');
    return;
  }
  if (!selectedRows.value.length) {
    createMessage.info('未选中行，将导出当前页数据（v0）');
  }
  const exportColumns = columns.value.filter((col: any) => col.key !== 'action' && col.dataIndex);
  const header = exportColumns.map((col: any) => escapeCsv(col.title || col.key)).join(',');
  const lines = rows.map((row: any) =>
    exportColumns
      .map((col: any) => escapeCsv(formatCsvValue(getCellValue(row, col.dataIndex))))
      .join(',')
  );
  const csv = [header, ...lines].join('\n');
  const filename = `${formKey.value || 'form'}-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const handleDelete = () => {
  if (!selectedRowKeys.value.length) return;
  Modal.confirm({
    title: '确认删除选中记录？',
    content: `共 ${selectedRowKeys.value.length} 条记录，删除后不可恢复。`,
    okText: '删除',
    okType: 'danger',
    async onOk() {
      if (!formKey.value) return;
      loading.value = true;
      try {
        await deleteFormData({
          formKey: formKey.value,
          recordIds: selectedRowKeys.value.map((key) => String(key)),
        });
        createMessage.success('删除成功');
        selectedRowKeys.value = [];
        selectedRows.value = [];
        await loadData();
      } catch (e: any) {
        createMessage.error('删除失败: ' + e.message);
      } finally {
        loading.value = false;
      }
    },
  });
};

onMounted(() => {
  loadColumnSettings();
  loadSchema();
  loadData();
});

watch(() => route.params.formKey, () => {
  loadColumnSettings();
  loadSchema();
  handleSearch();
});
</script>
