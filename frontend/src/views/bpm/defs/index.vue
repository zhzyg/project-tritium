<template>
  <PageWrapper title="流程定义" contentBackground>
    <a-card bordered size="small">
      <template #title>
        <a-space>
          <a-button type="primary" @click="openRegister">注册流程</a-button>
          <a-button :loading="loading" @click="fetchDefs">刷新</a-button>
        </a-space>
      </template>
      <a-table
        :data-source="defs"
        :columns="columns"
        row-key="processKey"
        size="small"
        :loading="loading"
        :pagination="false"
      />
    </a-card>

    <a-modal v-model:open="registerOpen" title="注册流程" :confirm-loading="registering" @ok="handleRegister">
      <a-form layout="vertical">
        <a-form-item label="流程Key" required>
          <a-input v-model:value="registerForm.processKey" placeholder="TRITIUM_APPROVAL_V1" />
        </a-form-item>
        <a-form-item label="名称">
          <a-input v-model:value="registerForm.name" placeholder="审批流程" />
        </a-form-item>
        <a-form-item label="分类">
          <a-input v-model:value="registerForm.category" placeholder="approval" />
        </a-form-item>
      </a-form>
    </a-modal>
  </PageWrapper>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import { message } from 'ant-design-vue';
  import { PageWrapper } from '/@/components/Page';
  import { listProcessDefs, registerProcessDef } from '/@/api/bpm/flowable';

  const defs = ref<any[]>([]);
  const loading = ref(false);
  const registering = ref(false);
  const registerOpen = ref(false);

  const registerForm = reactive({
    processKey: '',
    name: '',
    category: '',
  });

  const columns = computed(() => [
    { title: '流程Key', dataIndex: 'processKey', key: 'processKey', width: 220 },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '分类', dataIndex: 'category', key: 'category', width: 140 },
    {
      title: '启用',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      customRender: ({ text }: { text: number }) => (text === 1 ? '是' : '否'),
    },
    {
      title: '默认',
      dataIndex: 'isDefault',
      key: 'isDefault',
      width: 80,
      customRender: ({ text }: { text: number }) => (text === 1 ? '是' : '否'),
    },
  ]);

  const fetchDefs = async () => {
    loading.value = true;
    try {
      defs.value = (await listProcessDefs()) || [];
    } catch (err: any) {
      message.error(err?.message || '加载失败');
    } finally {
      loading.value = false;
    }
  };

  const openRegister = () => {
    registerForm.processKey = '';
    registerForm.name = '';
    registerForm.category = '';
    registerOpen.value = true;
  };

  const handleRegister = async () => {
    if (!registerForm.processKey) {
      message.warning('流程Key不能为空');
      return;
    }
    registering.value = true;
    try {
      await registerProcessDef({
        processKey: registerForm.processKey,
        name: registerForm.name,
        category: registerForm.category,
        enabled: 1,
      });
      message.success('注册成功');
      registerOpen.value = false;
      await fetchDefs();
    } catch (err: any) {
      message.error(err?.message || '注册失败');
    } finally {
      registering.value = false;
    }
  };

  onMounted(fetchDefs);
</script>
