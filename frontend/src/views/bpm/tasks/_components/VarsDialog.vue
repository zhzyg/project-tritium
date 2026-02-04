<template>
  <a-modal
    :visible="visible"
    title="流程变量"
    width="600px"
    :footer="null"
    @update:visible="val => $emit('update:visible', val)"
    @cancel="$emit('update:visible', false)"
  >
    <a-spin :spinning="loading">
      <pre v-if="varsData" class="bg-gray-100 p-4 rounded overflow-auto max-h-96">{{ JSON.stringify(varsData, null, 2) }}</pre>
      <a-empty v-else description="暂无变量" />
    </a-spin>
  </a-modal>
</template>

<script lang="ts" setup>
import { defineProps, defineEmits } from 'vue';

defineProps<{
  visible: boolean;
  loading: boolean;
  varsData: any;
}>();

defineEmits(['update:visible']);
</script>
