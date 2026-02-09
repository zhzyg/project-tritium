<template>
  <div class="menu-editor-item">
    <div class="menu-content" :style="{ paddingLeft: (level * 16) + 'px' }" data-testid="menu-editor-item-content">
      <span class="drag-handle" style="cursor: move; margin-right: 8px;">☰</span>
      <span>{{ item.meta?.title || item.name }}</span>
    </div>
    <div class="menu-children" v-if="item.children && item.children.length > 0">
      <draggable
        v-model="item.children"
        item-key="path"
        :group="{ name: 'nested-menu-' + level }"
        ghost-class="ghost"
        :animation="200"
        :disabled="false"
        tag="div"
      >
        <template #item="{ element }">
          <MenuEditorItem :item="element" :level="level + 1" />
        </template>
      </draggable>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import draggable from 'vuedraggable';

export default defineComponent({
  name: 'MenuEditorItem',
  components: { draggable },
  props: {
    item: {
      type: Object as PropType<any>,
      required: true,
    },
    level: {
      type: Number,
      default: 0,
    },
  },
});
</script>

<style scoped>
.menu-editor-item {
  border-bottom: 1px solid #eee;
}
.menu-content {
  padding: 10px;
  display: flex;
  align-items: center;
  background: #fff;
}
.ghost {
  opacity: 0.5;
  background: #c8ebfb;
}
</style>
