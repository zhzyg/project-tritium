<template>
  <PageWrapper :title="pageTitle" contentFullHeight>
    <div class="process-view-page">
      <div class="trace-container" v-if="traceData.length" style="padding: 16px; background: #fff; margin-top: 16px;">
        <h3>Process Trace</h3>
        <a-timeline style="margin-top: 16px;">
          <a-timeline-item v-for="(item, index) in traceData" :key="index" :color="item.type === 'END' ? 'green' : 'blue'">
            <p>{{ item.time }} - {{ item.taskName || item.type }}</p>
            <p v-if="item.assignee" style="color: #999; font-size: 12px;">Assignee: {{ item.assignee }}</p>
            <p v-if="item.comment" style="color: #666; font-style: italic; margin-top: 4px;">{{ item.comment }}</p>
          </a-timeline-item>
        </a-timeline>
      </div>

      <el-dialog v-model="varsVisible" title="Process Variables" width="50%">
        <pre>{{ JSON.stringify(varsData, null, 2) }}</pre>
      </el-dialog>
    </div>
  </PageWrapper>
</template>

<script lang="ts" setup>
  import { ref, onMounted, computed } from 'vue';
  import { useRoute } from 'vue-router';
  import { ElMessage } from 'element-plus';
  import { PageWrapper } from '/@/components/Page';
  import { getProcessVars, getProcessTrace } from '/@/api/bpm/flowable';

  const route = useRoute();
  
  const procInstId = ref('');
  const pageTitle = computed(() => `Process View - ${procInstId.value}`);
  
  const varsVisible = ref(false);
  const varsData = ref<any>(null);
  const traceData = ref<any[]>([]);

  const loadProcess = async () => {
      procInstId.value = route.query.procInstId as string;
      if (!procInstId.value) {
          ElMessage.error('Process Instance ID missing');
          return;
      }
      
      try {
          loadTrace();
          showVars();
      } catch (e: any) {
          console.error(e);
          ElMessage.error(e.message || 'Load failed');
      }
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

  onMounted(() => {
      loadProcess();
  });
</script>
<style scoped>
.process-view-page { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
</style>
