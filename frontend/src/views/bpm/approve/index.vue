<template>
  <PageWrapper :title="pageTitle" contentFullHeight>
    <div class="approve-page">
     <div class="task-header">
       <a-descriptions bordered>
         <a-descriptions-item label="任务名称">{{ taskName }}</a-descriptions-item>
         <a-descriptions-item label="任务ID">{{ taskId }}</a-descriptions-item>
         <a-descriptions-item label="创建时间">{{ createTime }}</a-descriptions-item>
         <a-descriptions-item label="处理人">
           <a-tag :color="assignee ? 'green' : 'orange'">{{ assignee || '未认领' }}</a-tag>
         </a-descriptions-item>
         <a-descriptions-item label="候选组" :span="2">
           <a-tag v-for="group in candidateGroups" :key="group" color="blue">{{ group }}</a-tag>
         </a-descriptions-item>
       </a-descriptions>
     </div>
      <div class="toolbar">
        <a-space>
          <a-button type="primary" @click="handleApprove" :disabled="!assignee">通过</a-button>
          <a-button type="danger" @click="handleReject" :disabled="!assignee">驳回</a-button>
          <a-button type="primary" v-if="!assignee" @click="handleClaim">认领</a-button>
           <a-tooltip title="MVP-5B">
             <a-button disabled>转派/委派</a-button>
           </a-tooltip>
          <a-button @click="goBack">返回</a-button>
        </a-space>
      </div>
      
      <div class="form-container">
        <VFormRender ref="renderRef" :form-json="formJson" :form-data="formData" :option-data="optionData" />
      </div>

      <div class="comments-container" style="padding: 16px; background: #fff; margin-top: 16px;">
          <h3>审批意见</h3>
          <a-input v-model:value="comment" placeholder="请输入审批意见" type="textarea" :rows="4" />
         <a-timeline style="margin-top: 16px;">
           <a-timeline-item v-for="item in commentsData" :key="item.id">
             <p>{{ item.time }} - {{ item.userId }}</p>
             <p style="color: #666; font-style: italic; margin-top: 4px;">{{ item.message }}</p>
           </a-timeline-item>
         </a-timeline>
       </div>

      <div class="trace-container" v-if="traceData.length" style="padding: 16px; background: #fff; margin-top: 16px;">
        <h3>流程轨迹</h3>
        <a-timeline style="margin-top: 16px;">
          <a-timeline-item v-for="(item, index) in traceData" :key="index" :color="item.type === 'END' ? 'green' : 'blue'">
            <p>{{ item.time }} - {{ item.taskName || item.type }}</p>
            <p v-if="item.assignee" style="color: #999; font-size: 12px;">处理人：{{ item.assignee }}</p>
            <p v-if="item.comment" style="color: #666; font-style: italic; margin-top: 4px;">{{ item.comment }}</p>
          </a-timeline-item>
        </a-timeline>
      </div>

      <el-dialog v-model="varsVisible" title="流程变量" width="50%">
        <pre>{{ JSON.stringify(varsData, null, 2) }}</pre>
        <template #footer>
           <a-button type="primary" @click="goBack">返回待办</a-button>
        </template>
      </el-dialog>
    </div>
  </PageWrapper>
</template>

<script lang="ts" setup>
  import { ref, onMounted, reactive, computed } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { ElMessage, ElMessageBox } from 'element-plus';
  import { PageWrapper } from '/@/components/Page';
  import { VFormRender } from 'vform3-builds';
  import 'vform3-builds/dist/render.style.css';
  import { getTaskContext, completeTask, getProcessVars, getProcessTrace, getTaskComments, claimTask } from '/@/api/bpm/flowable';
  import { getLatestSchema, getRecord } from '../../form/runtime/runtime.api';

  const route = useRoute();
  const router = useRouter();
  
  const taskId = ref('');
  const recordId = ref('');
  const formKey = ref('');
  const procInstId = ref('');
  const taskName = ref('');
  const processName = ref('');
 const assignee = ref('');
 const createTime = ref('');
 const candidateGroups = ref<string[]>([]);

  const pageTitle = computed(() => {
    if (processName.value && taskName.value) {
      return `${processName.value} - ${taskName.value}`;
    }
    return '任务审批';
  });
  
  const renderRef = ref<any>(null);
  const formJson = ref<Record<string, any>>({ widgetList: [], formConfig: {} });
  const formData = reactive<Record<string, any>>({});
  const optionData = reactive<Record<string, any>>({});
  
  const varsVisible = ref(false);
  const varsData = ref<any>(null);
  const traceData = ref<any[]>([]);
  const commentsData = ref<any[]>([]);
  const comment = ref('');

  const loadTask = async () => {
      taskId.value = route.query.taskId as string;
      if (!taskId.value) {
          ElMessage.error('缺少任务ID');
          return;
      }
      
      try {
          const ctx = await getTaskContext({ taskId: taskId.value });
          if (!ctx || !ctx.recordId) {
             ElMessage.error('任务上下文不存在');
             return;
          }
          recordId.value = ctx.recordId;
          formKey.value = ctx.formKey || '';
          procInstId.value = ctx.processInstanceId;
          taskName.value = ctx.taskName || '';
          processName.value = ctx.processName || '';
         assignee.value = ctx.assignee || '';
         createTime.value = ctx.createTime || '';
         candidateGroups.value = ctx.candidateGroups || [];
          
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
          loadComments();

      } catch (e: any) {
          console.error(e);
          ElMessage.error(e.message || '加载失败');
      }
  };

  const handleClaim = async () => {
   try {
     await claimTask({ taskId: taskId.value });
     ElMessage.success('认领成功');
     loadTask();
   } catch (error) {
     console.error(error);
     ElMessage.error('认领失败');
   }
 };
  const handleApprove = async () => {
      try {
          await completeTask({ 
              taskId: taskId.value, 
              formKey: formKey.value,
              recordId: recordId.value,
              comment: comment.value,
              variables: { status: 'APPROVED', reason: '', updatedAt: new Date().toISOString() } 
          });
          ElMessage.success('已通过');
          showVars();
          loadTrace();
          loadComments();
      } catch(e) { console.error(e); ElMessage.error('操作失败'); }
  };
  
  const handleReject = async () => {
      try {
        const { value } = await ElMessageBox.prompt('驳回原因', '驳回', {
             inputPattern: /\S+/,
             inputErrorMessage: '必填'
        });
        await completeTask({ 
             taskId: taskId.value, 
             formKey: formKey.value,
             recordId: recordId.value,
             comment: value,
             variables: { status: 'REJECTED', reason: value, updatedAt: new Date().toISOString() } 
        });
        ElMessage.success('已驳回');
        showVars();
        loadTrace();
        loadComments();
      } catch(e: any) { if(e !== 'cancel') ElMessage.error('操作失败'); }
  };
  
  const loadTrace = async () => {
      if (!procInstId.value) return;
      try {
          const res = await getProcessTrace({ procInstId: procInstId.value });
          traceData.value = res || [];
      } catch(e) { console.error(e); }
  };

   const loadComments = async () => {
       if (!taskId.value) return;
       try {
           const res = await getTaskComments({ taskId: taskId.value });
           commentsData.value = res || [];
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
