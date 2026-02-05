<template>
  <MenuItem :key="item.path" :title="item.title" :data-testid="menuTestId">
    <MenuItemContent v-bind="$props" :item="item" />
  </MenuItem>
</template>
<script lang="ts">
  import { defineComponent, computed } from 'vue';
  import { Menu } from 'ant-design-vue';
  import { itemProps } from '../props';

  import MenuItemContent from './MenuItemContent.vue';
  export default defineComponent({
    name: 'BasicMenuItem',
    components: { MenuItem: Menu.Item, MenuItemContent },
    props: itemProps,
    setup(props) {
      const menuTestId = computed(() => {
        const raw = props.item?.path || props.item?.name || props.item?.title || 'menu';
        return `menu-item-${String(raw).replace(/[^a-zA-Z0-9_-]+/g, '-')}`;
      });
      return { menuTestId };
    },
  });
</script>
