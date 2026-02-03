<template>
  <div class="flex gap-2 flex-wrap">
    <template v-for="act in actions" :key="act.key">
      <a-button 
        :type="act.type === 'link' ? 'link' : act.type || 'primary'"
        :danger="act.danger || act.type === 'danger'"
        size="small"
        @click="act.onClick(row)"
      >
        {{ act.label }}
      </a-button>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { getRowActions } from '../../bpmActions';

const props = defineProps<{
  row: any;
  scene?: 'my' | 'tasks' | 'done';
}>();

const emit = defineEmits(['claim', 'approve', 'reject', 'open', 'open-vars']);

const handlers = {
  handleClaim: (row: any) => emit('claim', row),
  handleApprove: (row: any) => emit('approve', row),
  handleReject: (row: any) => emit('reject', row),
  handleOpen: (row: any) => emit('open', row),
  handleVars: (row: any) => emit('open-vars', row),
};

const actions = computed(() => {
  return getRowActions(props.scene || 'tasks', props.row, handlers);
});
</script>
