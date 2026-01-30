<template>
  <div class="p-4">
    <BasicTable @register="registerTable">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <TableAction
            :actions="[
              {
                label: 'Claim',
                ifShow: !record.assignee,
                onClick: handleClaim.bind(null, record),
              },
              {
                label: 'Complete',
                ifShow: !!record.assignee,
                onClick: handleComplete.bind(null, record),
              },
              {
                label: 'Variables',
                onClick: handleVars.bind(null, record),
              },
            ]"
          />
        </template>
      </template>
    </BasicTable>
    
    <BasicDrawer @register="registerDrawer" title="Process Variables" width="50%">
       <div v-if="varsLoading">Loading...</div>
       <div v-else>
         <pre>{{ JSON.stringify(varsData, null, 2) }}</pre>
       </div>
    </BasicDrawer>
  </div>
</template>
<script lang="ts" setup>
  import { BasicTable, useTable, TableAction } from '/@/components/Table';
  import { useDrawer, BasicDrawer } from '/@/components/Drawer';
  import { listTasks, claimTask, completeTask, getProcessVars, TaskItem } from '/@/api/bpm/flowable';
  import { useMessage } from '/@/hooks/web/useMessage';
  import { ref } from 'vue';

  const { createMessage } = useMessage();
  const [registerDrawer, { openDrawer }] = useDrawer();
  
  const varsData = ref({});
  const varsLoading = ref(false);

  const [registerTable, { reload }] = useTable({
    title: 'My Tasks',
    api: listTasks,
    columns: [
      { title: 'Task ID', dataIndex: 'taskId', width: 200 },
      { title: 'Name', dataIndex: 'name', width: 200 },
      { title: 'Assignee', dataIndex: 'assignee', width: 150 },
      { title: 'Create Time', dataIndex: 'createTime', width: 180 },
      { title: 'Process Instance ID', dataIndex: 'processInstanceId', width: 200 },
    ],
    actionColumn: {
      width: 250,
      title: 'Action',
      dataIndex: 'action',
      fixed: 'right',
    },
    useSearchForm: false,
    showTableSetting: true,
    bordered: true,
    showIndexColumn: false,
  });

  async function handleClaim(record: TaskItem) {
    try {
      await claimTask({ taskId: record.taskId });
      createMessage.success('Task claimed successfully');
      reload();
    } catch (error) {
       console.error(error);
    }
  }

  async function handleComplete(record: TaskItem) {
    try {
      await completeTask({ taskId: record.taskId });
      createMessage.success('Task completed successfully');
      reload();
    } catch (error) {
      console.error(error);
    }
  }

  async function handleVars(record: TaskItem) {
    openDrawer(true);
    varsLoading.value = true;
    try {
       if (record.processInstanceId) {
         varsData.value = await getProcessVars({ processInstanceId: record.processInstanceId });
       }
    } catch (error) {
      console.error(error);
    } finally {
      varsLoading.value = false;
    }
  }
</script>
