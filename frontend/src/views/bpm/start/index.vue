<template>
  <PageWrapper title="流程发起" contentBackground>
    <a-card bordered size="small">
      <a-form layout="inline" class="mb-4">
        <a-form-item label="流程定义">
          <a-select
            v-model:value="processKey"
            placeholder="请选择流程"
            style="width: 260px"
            :options="processOptions"
            :loading="loadingDefs"
            data-testid="bpm-start-proc"
          />
        </a-form-item>
        <a-form-item label="业务表单">
          <a-select
            v-model:value="formKey"
            placeholder="请选择表单"
            style="width: 240px"
            :options="formOptions"
            :loading="loadingForms"
            data-testid="bpm-start-form"
          />
        </a-form-item>
        <a-form-item>
          <a-button @click="reloadOptions">刷新</a-button>
        </a-form-item>
      </a-form>

      <a-alert
        class="mb-4"
        type="info"
        show-icon
        message="选择流程与表单后填写数据，提交即发起流程并跳转到“我发起的”。"
      />

      <div class="bpm-start-form" data-testid="bpm-start-render">
        <VFormRender ref="renderRef" :form-json="formJson" :form-data="formData" :option-data="optionData" />
        <a-empty v-if="!schemaReady" description="请选择已发布表单" />
      </div>

      <div class="bpm-start-actions">
        <a-button
          type="primary"
          :loading="submitting"
          :disabled="!schemaReady || !processKey"
          data-testid="bpm-start-submit"
          @click="handleSubmit"
        >
          提交并发起
        </a-button>
      </div>
    </a-card>
  </PageWrapper>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref, watch } from 'vue';
  import { useRouter } from 'vue-router';
  import { message } from 'ant-design-vue';
  import { PageWrapper } from '/@/components/Page';
  import { VFormRender } from 'vform3-builds';
  import 'vform3-builds/dist/render.style.css';
  import { listProcessDefs, startProcess } from '/@/api/bpm/flowable';
  import { getLatestPublishedSchemaJson, insertRecord, listPublishedSchemas } from '/@/views/form/runtime/runtime.api';

  const router = useRouter();
  const renderRef = ref<any>(null);
  const formJson = ref<Record<string, any>>({ widgetList: [], formConfig: {} });
  const formData = reactive<Record<string, any>>({});
  const optionData = reactive<Record<string, any>>({});

  const processKey = ref('');
  const formKey = ref('');
  const processDefs = ref<any[]>([]);
  const formSchemas = ref<any[]>([]);
  const loadingDefs = ref(false);
  const loadingForms = ref(false);
  const loadingSchema = ref(false);
  const submitting = ref(false);
  const schemaReady = ref(false);

  const processOptions = computed(() =>
    processDefs.value
      .filter((item) => item?.enabled !== 0)
      .map((item) => ({
        label: item?.name ? `${item.name} (${item.processKey})` : item.processKey,
        value: item.processKey,
      }))
  );

  const formOptions = computed(() =>
    formSchemas.value.map((item) => ({
      label: `${item.formKey} (v${item.version})`,
      value: item.formKey,
    }))
  );

  const resetFormData = () => {
    Object.keys(formData).forEach((key) => delete formData[key]);
    if (renderRef.value?.setFormData) {
      renderRef.value.setFormData({});
    }
  };

  const loadProcessDefs = async () => {
    loadingDefs.value = true;
    try {
      processDefs.value = (await listProcessDefs()) || [];
      if (!processKey.value && processOptions.value.length) {
        processKey.value = processOptions.value[0].value;
      }
    } catch (err: any) {
      message.error(err?.message || '流程定义加载失败');
      processDefs.value = [];
    } finally {
      loadingDefs.value = false;
    }
  };

  const loadFormList = async () => {
    loadingForms.value = true;
    try {
      formSchemas.value = (await listPublishedSchemas()) || [];
      if (!formKey.value && formOptions.value.length) {
        formKey.value = formOptions.value[0].value;
      }
    } catch (err: any) {
      message.error(err?.message || '表单列表加载失败');
      formSchemas.value = [];
    } finally {
      loadingForms.value = false;
    }
  };

  const loadFormSchema = async () => {
    if (!formKey.value) {
      schemaReady.value = false;
      formJson.value = { widgetList: [], formConfig: {} };
      return;
    }
    loadingSchema.value = true;
    schemaReady.value = false;
    resetFormData();
    try {
      const res = await getLatestPublishedSchemaJson({ formKey: formKey.value });
      if (!res?.schemaJson) {
        throw new Error('schemaJson is empty');
      }
      const parsed = JSON.parse(res.schemaJson);
      formJson.value = parsed;
      if (renderRef.value?.setFormJson) {
        renderRef.value.setFormJson(parsed);
      }
      schemaReady.value = true;
    } catch (err: any) {
      message.error(err?.message || '表单加载失败');
      schemaReady.value = false;
    } finally {
      loadingSchema.value = false;
    }
  };

  const reloadOptions = async () => {
    await Promise.all([loadProcessDefs(), loadFormList()]);
    await loadFormSchema();
  };

  const handleSubmit = async () => {
    if (!processKey.value || !formKey.value) {
      message.warning('请选择流程与表单');
      return;
    }
    const api = renderRef.value;
    if (!api?.getFormData) {
      message.error('表单渲染未就绪');
      return;
    }
    submitting.value = true;
    try {
      const data = await api.getFormData();
      const recordResp = await insertRecord({ formKey: formKey.value, data: data || {} });
      const recordId = recordResp?.recordId;
      if (!recordId) {
        throw new Error('recordId empty');
      }
      await startProcess({
        processKey: processKey.value,
        formKey: formKey.value,
        recordId,
        businessKey: recordId,
      });
      message.success('流程已发起，正在跳转...');
      router.push('/bpm/my');
    } catch (err: any) {
      message.error(err?.message || '发起失败');
    } finally {
      submitting.value = false;
    }
  };

  watch(formKey, async (next) => {
    if (!next) return;
    await loadFormSchema();
  });

  onMounted(async () => {
    await reloadOptions();
  });
</script>

<style scoped>
  .bpm-start-form {
    min-height: 240px;
    position: relative;
  }

  .bpm-start-actions {
    margin-top: 16px;
    text-align: right;
  }
</style>
