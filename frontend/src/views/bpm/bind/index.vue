<template>
  <PageWrapper title="表单绑定流程" contentBackground>
    <a-card bordered size="small">
      <div class="bind-toolbar">
        <a-space>
          <a-input v-model:value="formKey" placeholder="formKey" style="width: 200px" />
          <a-select
            v-model:value="selectedProcessKey"
            placeholder="选择流程"
            style="width: 260px"
            :options="processOptions"
            allow-clear
          />
          <a-button type="primary" :loading="saving" @click="handleBind">设为默认绑定</a-button>
          <a-button :loading="loading" @click="fetchDefs">刷新流程列表</a-button>
        </a-space>
      </div>
      <div class="bind-meta">
        <span>当前默认绑定：</span>
        <a-tag v-if="currentBinding" color="blue">{{ currentBinding }}</a-tag>
        <span v-else>-</span>
      </div>
    </a-card>
  </PageWrapper>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref } from 'vue';
  import { message } from 'ant-design-vue';
  import { PageWrapper } from '/@/components/Page';
  import { listProcessDefs, setDefaultBind } from '/@/api/bpm/flowable';

  const formKey = ref('dev');
  const defs = ref<any[]>([]);
  const selectedProcessKey = ref<string>();
  const currentBinding = ref<string>('');
  const loading = ref(false);
  const saving = ref(false);

  const processOptions = computed(() =>
    defs.value
      .filter((item) => item?.enabled === 1)
      .map((item) => ({ label: `${item.processKey}${item.name ? ` - ${item.name}` : ''}`, value: item.processKey }))
  );

  const fetchDefs = async () => {
    loading.value = true;
    try {
      defs.value = (await listProcessDefs()) || [];
      if (!selectedProcessKey.value && defs.value.length > 0) {
        selectedProcessKey.value = defs.value[0].processKey;
      }
    } catch (err: any) {
      message.error(err?.message || '加载失败');
    } finally {
      loading.value = false;
    }
  };

  const handleBind = async () => {
    if (!formKey.value || !selectedProcessKey.value) {
      message.warning('formKey 和流程Key 必填');
      return;
    }
    saving.value = true;
    try {
      await setDefaultBind({ formKey: formKey.value, processKey: selectedProcessKey.value });
      currentBinding.value = selectedProcessKey.value;
      message.success('绑定成功');
    } catch (err: any) {
      message.error(err?.message || '绑定失败');
    } finally {
      saving.value = false;
    }
  };

  onMounted(fetchDefs);
</script>

<style scoped>
  .bind-toolbar {
    margin-bottom: 12px;
  }

  .bind-meta {
    margin-top: 8px;
    color: #666;
  }
</style>
