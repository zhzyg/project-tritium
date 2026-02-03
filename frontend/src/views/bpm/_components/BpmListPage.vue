<template>
  <div class="p-4" :data-testid="testId">
    <el-card shadow="never">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-medium">{{ title }}</span>
          <el-button type="primary" :icon="Refresh" @click="loadData" :loading="loading">
            刷新
          </el-button>
        </div>
      </template>

      <!-- 简单搜索栏 -->
      <div class="mb-4 flex gap-2">
        <el-input
          v-model="query.keyword"
          placeholder="关键词搜索"
          clearable
          style="width: 240px"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>

      <!-- 错误提示 -->
      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        show-icon
        class="mb-4"
      >
        <template #default>
          <el-button link type="primary" @click="loadData">点击重试</el-button>
        </template>
      </el-alert>

      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%"
      >
        <template v-for="col in columns" :key="col.prop">
          <el-table-column
            v-if="col.slot"
            :label="col.label"
            :prop="col.prop"
            :min-width="col.minWidth"
          >
            <template #default="scope">
              <slot :name="col.slot" :row="scope.row" :index="scope.$index"></slot>
            </template>
          </el-table-column>
          <el-table-column
            v-else
            :label="col.label"
            :prop="col.prop"
            :min-width="col.minWidth"
          />
        </template>
      </el-table>

      <!-- 分页 -->
      <div class="mt-4 flex justify-end">
        <el-pagination
          v-model:current-page="query.pageNo"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue';
import { Refresh } from '@element-plus/icons-vue';

interface Column {
  label: string;
  prop: string;
  minWidth?: number;
  slot?: string;
}

const props = defineProps<{
  title: string;
  testId: string;
  fetchPage: (query: any) => Promise<{ records: any[]; total: number }>;
  columns: Column[];
  defaultQuery?: any;
}>();

const loading = ref(false);
const errorMessage = ref('');
const tableData = ref<any[]>([]);
const total = ref(0);

const query = reactive({
  pageNo: 1,
  pageSize: 10,
  keyword: '',
  ...(props.defaultQuery || {}),
});

const loadData = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await props.fetchPage({ ...query });
    tableData.value = res.records;
    total.value = res.total;
  } catch (error: any) {
    console.error('[BpmListPage] Load failed:', error);
    errorMessage.value = error.message || '数据加载失败';
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
  query.keyword = '';
  query.pageNo = 1;
  loadData();
};

const handleSizeChange = () => {
  query.pageNo = 1;
  loadData();
};

const handleCurrentChange = () => {
  loadData();
};

onMounted(() => {
  loadData();
});

defineExpose({
  loadData,
});
</script>
