<template>
  <PageWrapper title="Task Approval" contentFullHeight>
    <div class="approve-page">
      <div class="toolbar">
        <a-space>
          <a-button type="primary" @click="handleApprove">Approve</a-button>
          <a-button type="danger" @click="handleReject">Reject</a-button>
          <a-button @click="goBack">Back</a-button>
        </a-space>
      </div>
      
      <div class="form-container">
        <VFormRender ref="renderRef" :form-json="formJson" :form-data="formData" :option-data="optionData" />
      </div>

      <div class="trace-container" v-if="traceData.length" style="padding: 16px; background: #fff; margin-top: 16px;">
        <h3>Process Trace</h3>
        <a-timeline style="margin-top: 16px;">
          <a-timeline-item v-for="(item, index) in traceData" :key="index" :color="item.type === 'END' ? 'green' : 'blue'">
            <p>{{ item.time }} - {{ item.taskName || item.type }}</p>
            <p v-if="item.assignee" style="color: #999; font-size: 12px;">Assignee: {{ item.assignee }}</p>
          </a-timeline-item>
        </a-timeline>
      </div>

      <el-dialog v-model="varsVisible" title="Process Variables" width="50%">
        <pre>{{ JSON.stringify(varsData, null, 2) }}</pre>
        <template #footer>
           <a-button type="primary" @click="goBack">Back to Tasks</a-button>
        </template>
      </el-dialog>
    </div>
  </PageWrapper>
</template>

<script lang="ts" setup>
  import { ref, onMounted, reactive } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { ElMessage, ElMessageBox } from 'element-plus';
  import { PageWrapper } from '/@/components/Page';
  import { VFormRender } from 'vform3-builds';
  import 'vform3-builds/dist/render.style.css';
  import { getTaskContext, completeTask, getProcessVars, getProcessTrace } from '/@/api/bpm/flowable';
  import { getLatestSchema, getRecord } from '../../form/runtime/runtime.api';

  const route = useRoute();
  const router = useRouter();
  
  const taskId = ref('');
  const recordId = ref('');
  const formKey = ref('');
  const procInstId = ref('');
  
  const renderRef = ref<any>(null);
  const formJson = ref<Record<string, any>>({ widgetList: [], formConfig: {} });
  const formData = reactive<Record<string, any>>({});
  const optionData = reactive<Record<string, any>>({});
  
  const varsVisible = ref(false);
  const varsData = ref<any>(null);
  const traceData = ref<any[]>([]);

  const loadTask = async () => {
      taskId.value = route.query.taskId as string;
      if (!taskId.value) {
          ElMessage.error('Task ID missing');
          return;
      }
      
      try {
          const ctx = await getTaskContext({ taskId: taskId.value });
          if (!ctx || !ctx.recordId) {
             ElMessage.error('Context not found');
             return;
          }
          recordId.value = ctx.recordId;
          formKey.value = ctx.formKey || '';
          procInstId.value = ctx.processInstanceId;
          
          const schemaRes = await getLatestSchema({ formKey: formKey.value });
          if (schemaRes?.schemaJson) {
              formJson.value = JSON.parse(schemaRes.schemaJson);
              if (renderRef.value?.setFormJson) {
                  renderRef.value.setFormJson(formJson.value);
              }
          }
          
          const recordRes = await getRecord({ id: recordId.value });
          if (recordRes?.dataJson) {
               const data = JSON.parse(recordRes.dataJson);
               Object.assign(formData, data);
               if (renderRef.value?.setFormData) {
                   renderRef.value.setFormData(data);
               }
          }
          
          if (renderRef.value?.disableForm) {
               renderRef.value.disableForm();
          }
          
          loadTrace();

      } catch (e: any) {
          console.error(e);
          ElMessage.error(e.message || 'Load failed');
      }
  };

  const handleApprove = async () => {
      try {
          await completeTask({ 
              taskId: taskId.value, 
              variables: { status: 'APPROVED', reason: '', updatedAt: new Date().toISOString() } 
          });
          ElMessage.success('Approved');
          showVars();
          loadTrace();
      } catch(e) { console.error(e); ElMessage.error('Failed'); }
  };
  
  const handleReject = async () => {
      try {
        const { value } = await ElMessageBox.prompt('Reason', 'Reject', {
             inputPattern: /\S+/,
             inputErrorMessage: 'Required'
        });
        await completeTask({ 
             taskId: taskId.value, 
             variables: { status: 'REJECTED', reason: value, updatedAt: new Date().toISOString() } 
        });
        ElMessage.success('Rejected');
        showVars();
        loadTrace();
      } catch(e: any) { if(e !== 'cancel') ElMessage.error('Failed'); }
  };
  
  const loadTrace = async () => {
      if (!procInstId.value) return;
      try {
          const res = await getProcessTrace({ procInstId: procInstId.value });
          traceData.value = res || [];
      } catch(e) { console.error(e); }
  };

  const showVars = async () => {
      if (!procInstId.value) return;
      const res = await getProcessVars({ processInstanceId: procInstId.value });
      varsData.value = res;
      varsVisible.value = true;
  };
  
  const goBack = () => {
      router.push('/bpm/tasks');
  };

  onMounted(() => {
      loadTask();
  });
</script>
<style scoped>
.approve-page { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.form-container { pointer-events: none; opacity: 0.8; background: #f9f9f9; padding: 10px; border-radius: 4px; }
</style>
