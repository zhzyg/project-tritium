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
        <a-form-item>
          <a-button type="primary" @click="handleSearch">查询</a-button>
        </a-form-item>
      </a-form>

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
    </a-card>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ReloadOutlined } from '@ant-design/icons-vue';
import { useMessage } from '/@/hooks/web/useMessage';
import { getLatestPublishedSchema, getFormDataPage } from '/@/api/form/engine';

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
const columns = ref<any[]>([
  { title: 'ID', dataIndex: 'id', key: 'id', width: 200 },
  { title: '创建人', dataIndex: 'createdBy', key: 'createdBy' },
  { title: '创建时间', dataIndex: 'createdTime', key: 'createdTime' },
]);

const query = reactive({
  pageNo: 1,
  pageSize: 10,
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
    onChange: (keys: string[]) => {
      selectedRowKeys.value = keys;
    },
  };
});

const loadSchema = async () => {
  if (!formKey.value) return;
  try {
    const res = await getLatestPublishedSchema({ formKey: formKey.value });
    if (res && res.fieldMetas) {
      formTitle.value = res.formTitle || formKey.value;
      const dynamicCols = res.fieldMetas.map((m: any) => ({
        title: m.label,
        dataIndex: ['data', m.fieldKey], // Nested path for physical data
        key: m.fieldKey,
      }));
      columns.value = [
        ...dynamicCols,
        { title: '创建时间', dataIndex: 'createdTime', key: 'createdTime' },
        { title: '操作', key: 'action', fixed: 'right', width: 100 },
      ];
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
    const res = await getFormDataPage(params);
    tableData.value = res.records || [];
    total.value = res.total || 0;
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

const handleTableChange = (pag: any) => {
  query.pageNo = pag.current;
  query.pageSize = pag.pageSize;
  loadData();
};

const handleView = (record: any) => {
  router.push({
    path: `/form/runtime/${formKey.value}/view`,
    query: { recordId: record.id },
  });
};

onMounted(() => {
  loadSchema();
  loadData();
});

watch(() => route.params.formKey, () => {
  loadSchema();
  handleSearch();
});
</script>
