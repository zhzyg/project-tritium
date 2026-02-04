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
          <a-form-item v-if="showFormSelect" label="业务表单">
            <a-select
              v-model:value="formKey"
              placeholder="请选择表单"
              style="width: 240px"
              :options="formOptions"
              :loading="loadingForms || bindingLoading"
              data-testid="bpm-start-form"
            />
          </a-form-item>
          <a-form-item v-else>
            <a-button type="link" data-testid="bpm-start-manual-toggle" @click="manualMode = true">
              手动选择表单
            </a-button>
          </a-form-item>
          <a-form-item>
            <a-button @click="reloadOptions">刷新</a-button>
          </a-form-item>
        </a-form>

        <a-alert
          v-if="bindingMissing"
          class="mb-4"
          type="warning"
          show-icon
          data-testid="bpm-start-bind-missing"
          message="该流程未绑定表单，请先配置绑定或手动选择表单。"
        />
        <a-alert
          v-else-if="boundFormKey"
          class="mb-4"
          type="success"
          show-icon
          data-testid="bpm-start-bind-ok"
          :message="`已自动带出表单：${boundFormLabel}`"
        />

        <a-alert
          v-if="!canStartGlobal"
          class="mb-4"
          type="warning"
          show-icon
          data-testid="bpm-start-no-permission"
          message="当前账号没有发起权限，请联系管理员授权。"
        />

        <a-alert
          v-else-if="!processCanStart"
          class="mb-4"
          type="warning"
          show-icon
          data-testid="bpm-start-proc-no-permission"
          :message="processMissingPerm ? `无权发起该流程，缺少权限码：${processMissingPerm}` : '无权发起该流程'"
        />

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
          :disabled="!schemaReady || !processKey || !canStartGlobal || !processCanStart"
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
  import { usePermission } from '/@/hooks/web/usePermission';
  import { getProcFormBind, listProcessDefs, startProcess } from '/@/api/bpm/flowable';
  import { getLatestPublishedSchemaJson, insertRecord, listPublishedSchemas } from '/@/views/form/runtime/runtime.api';

  const router = useRouter();
  const { hasPermission } = usePermission();
  const START_PERMISSION = 'bpm:start';
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
  const bindingLoading = ref(false);
  const submitting = ref(false);
  const schemaReady = ref(false);
  const bindingMissing = ref(false);
  const boundFormKey = ref('');
  const boundFormName = ref('');
  const manualMode = ref(false);
  let bindingRequestId = 0;

  const processOptions = computed(() =>
    processDefs.value
      .filter((item) => item?.enabled !== 0)
      .map((item) => {
        const baseLabel = item?.name ? `${item.name} (${item.processKey})` : item.processKey;
        const canStart = item?.canStart !== false;
        return {
          label: canStart ? baseLabel : `${baseLabel} [无权限]`,
          value: item.processKey,
        };
      })
  );

  const formOptions = computed(() =>
    formSchemas.value.map((item) => ({
      label: `${item.formKey} (v${item.version})`,
      value: item.formKey,
    }))
  );

  const canStartGlobal = computed(() => hasPermission(START_PERMISSION));

  const selectedProcess = computed(() =>
    processDefs.value.find((item) => item?.processKey === processKey.value)
  );
  const processCanStart = computed(() => selectedProcess.value?.canStart !== false);
  const processMissingPerm = computed(() => selectedProcess.value?.missingPerm || '');

  const boundFormLabel = computed(() =>
    boundFormName.value ? `${boundFormName.value} (${boundFormKey.value})` : boundFormKey.value
  );

  const showFormSelect = computed(() => manualMode.value || bindingMissing.value || !boundFormKey.value);

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
        const preferred = processDefs.value.find((item) => item?.enabled !== 0 && item?.canStart !== false);
        processKey.value = preferred ? preferred.processKey : processOptions.value[0].value;
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
    } catch (err: any) {
      message.error(err?.message || '表单列表加载失败');
      formSchemas.value = [];
    } finally {
      loadingForms.value = false;
    }
  };

  const loadProcessBinding = async (key: string) => {
    const requestId = (bindingRequestId += 1);
    bindingLoading.value = true;
    bindingMissing.value = false;
    boundFormKey.value = '';
    boundFormName.value = '';
    manualMode.value = false;
    try {
      const resp = await getProcFormBind({ procDefKey: key });
      if (requestId !== bindingRequestId) return;
      if (resp?.formKey) {
        boundFormKey.value = resp.formKey;
        boundFormName.value = resp.formName || '';
        formKey.value = resp.formKey;
        return;
      }
      bindingMissing.value = true;
      manualMode.value = true;
    } catch (err) {
      if (requestId !== bindingRequestId) return;
      bindingMissing.value = true;
      manualMode.value = true;
    } finally {
      if (requestId === bindingRequestId) {
        bindingLoading.value = false;
      }
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
    if (processKey.value) {
      await loadProcessBinding(processKey.value);
    }
  };

  const handleSubmit = async () => {
    if (!canStartGlobal.value) {
      message.warning('无发起权限');
      return;
    }
    if (!processCanStart.value) {
      message.warning(processMissingPerm.value ? `缺少权限：${processMissingPerm.value}` : '无权发起该流程');
      return;
    }
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

  watch(processKey, async (next) => {
    formKey.value = '';
    boundFormKey.value = '';
    boundFormName.value = '';
    bindingMissing.value = false;
    manualMode.value = false;
    if (!next) return;
    await loadProcessBinding(next);
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
