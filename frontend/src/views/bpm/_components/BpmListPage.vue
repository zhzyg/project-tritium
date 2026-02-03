<template>
  <div class="p-4" :data-testid="testId" :title="title">
    <a-card :title="title" :bordered="false">
      <template #extra>
        <a-button type="primary" @click="loadData" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </template>

      <!-- 统一筛选条 -->
      <a-form layout="inline" class="mb-4" v-if="showFilter">
        <a-form-item label="关键字">
          <a-input v-model:value="query.keyword" placeholder="搜索关键词" allow-clear @pressEnter="handleSearch" />
        </a-form-item>
        
        <a-form-item label="状态" v-if="statusOptions && statusOptions.length">
          <a-select v-model:value="query.status" placeholder="请选择状态" style="width: 150px" allow-clear @change="handleSearch">
            <a-select-option v-for="opt in statusOptions" :key="colValue(opt)" :value="colValue(opt)">
              {{ colLabel(opt) }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="时间范围" v-if="showTimeRange">
          <a-range-picker v-model:value="timeRange" @change="handleTimeChange" />
        </a-form-item>

        <a-form-item>
          <a-button type="primary" @click="handleSearch">查询</a-button>
          <a-button style="margin-left: 8px" @click="handleReset">重置</a-button>
        </a-form-item>
      </a-form>

      <!-- 表格 -->
      <a-table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        row-key="id"
        size="middle"
        :pagination="pagination"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record, index }">
          <!-- 默认槽位逻辑 -->
          <slot :name="column.slot" :row="record" :index="index" v-if="column.slot && column.slot !== 'action'"></slot>
          
          <!-- 统一 Action 处理 -->
          <template v-else-if="column.slot === 'action'">
            <div class="flex gap-2 flex-wrap">
              <slot name="action" :row="record" :index="index">
                <!-- 如果页面没传 action slot，尝试使用默认配置渲染 -->
                <template v-for="act in getActions(record)" :key="act.key">
                  <a-button 
                    :type="act.type === 'link' ? 'link' : 'primary'"
                    :danger="act.danger"
                    size="small"
                    @click="act.onClick(record)"
                  >
                    {{ act.label }}
                  </a-button>
                </template>
              </slot>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ReloadOutlined } from '@ant-design/icons-vue';
import { useMessage } from '/@/hooks/web/useMessage';

interface Column {
  title: string;
  dataIndex: string;
  key?: string;
  width?: number;
  slot?: string;
}

const props = defineProps<{
  title: string;
  testId: string;
  fetchPage: (query: any) => Promise<{ records: any[]; total: number }>;
  columns: Column[];
  showFilter?: boolean;
  statusOptions?: any[];
  showTimeRange?: boolean;
  getActions?: (row: any) => any[];
}>();

const { createMessage } = useMessage();
const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const timeRange = ref<any[]>([]);

const query = reactive({
  pageNo: 1,
  pageSize: 10,
  keyword: '',
  status: undefined,
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

const loadData = async () => {
  loading.value = true;
  try {
    const res = await props.fetchPage({ ...query });
    // In Jeecg, some rows don't have id but have taskId or processInstanceId
    tableData.value = res.records.map(r => ({ ...r, id: r.id || r.taskId || r.processInstanceId }));
    total.value = res.total;
  } catch (error: any) {
    console.error('[BpmListPage] Load failed:', error);
    createMessage.error(error.message || '数据加载失败');
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  query.pageNo = 1;
  loadData();
};

const handleReset = () => {
  Object.assign(query, {
    pageNo: 1,
    pageSize: 10,
    keyword: '',
    status: undefined,
    startTime: '',
    endTime: '',
  });
  timeRange.value = [];
  loadData();
};

const handleTableChange = (pagination: any) => {
  query.pageNo = pagination.current;
  query.pageSize = pagination.pageSize;
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

const colValue = (opt: any) => (typeof opt === 'string' ? opt : opt.value);
const colLabel = (opt: any) => (typeof opt === 'string' ? opt : opt.label);

onMounted(loadData);

defineExpose({ loadData });
</script>