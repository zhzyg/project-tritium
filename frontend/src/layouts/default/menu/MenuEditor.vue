<template>
  <div class="menu-editor-container" style="height: 100%; overflow-y: auto; background: white;" data-testid="sidebar-edit-list">
    <div class="actions" style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: flex-end; position: sticky; top: 0; z-index: 10; background: white;">
      <a-button size="small" @click="$emit('reset')" data-testid="btn-menu-reset" style="margin-right: 8px;">恢复默认</a-button>
      <a-button type="primary" size="small" @click="handleSave" data-testid="btn-sidebar-menu-edit">完成</a-button>
    </div>
    <div class="list-container">
      <draggable
        v-model="localItems"
        item-key="path"
        group="menu-root"
        ghost-class="ghost"
        :animation="200"
        tag="div"
      >
        <template #item="{ element }">
          <MenuEditorItem :item="element" :level="0" />
        </template>
      </draggable>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, PropType } from 'vue';
import draggable from 'vuedraggable';
import MenuEditorItem from './MenuEditorItem.vue';
import { defHttp } from '/@/utils/http/axios';
import { useMessage } from '/@/hooks/web/useMessage';
import { usePermissionStore } from '/@/store/modules/permission';
import { Button } from 'ant-design-vue';

export default defineComponent({
  name: 'MenuEditor',
  components: { draggable, MenuEditorItem, AButton: Button },
  props: {
    items: {
      type: Array as PropType<any[]>,
      default: () => [],
    },
  },
  emits: ['save', 'reset', 'close'],
  setup(props, { emit }) {
    const localItems = ref<any[]>([]);
    const { createMessage } = useMessage();
    const permissionStore = usePermissionStore();

    watch(
      () => props.items,
      (newVal) => {
        localItems.value = JSON.parse(JSON.stringify(newVal));
      },
      { immediate: true, deep: true }
    );

    async function handleSave() {
        const layout = {
          top: localItems.value.map((item) => item.id || item.meta?.permissionId || item.path).filter(Boolean),
          children: {},
        };

        const traverse = (items) => {
            items.forEach((item) => {
                if (item.children && item.children.length > 0) {
                    const pid = item.id || item.meta?.permissionId || item.path;
                    if (pid) {
                        layout.children[pid] = item.children.map((c) => c.id || c.meta?.permissionId || c.path).filter(Boolean);
                    }
                    traverse(item.children);
                }
            });
        }
        traverse(localItems.value);

        try {
            await defHttp.post({ url: '/sys/menuLayout/saveMine', params: layout });
            createMessage.success('布局已保存');
            await permissionStore.buildRoutesAction();
            emit('close');
        } catch (e) {
            console.error(e);
        }
    }

    return { localItems, handleSave };
  },
});
</script>
