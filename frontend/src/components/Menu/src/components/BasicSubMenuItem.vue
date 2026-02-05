<template>
  <BasicMenuItem v-if="!menuHasChildren(item) && getShowMenu" v-bind="$props" />
  <SubMenu
    v-if="menuHasChildren(item) && getShowMenu"
    :class="[theme]"
    :key="`submenu-${item.path}`"
    :data-testid="menuTestId"
    popupClassName="app-top-menu-popup"
  >
    <template #title>
      <MenuItemContent v-bind="$props" :item="item" />
    </template>

    <template v-for="childrenItem in item.children || []" :key="childrenItem.path">
      <BasicSubMenuItem v-bind="$props" :item="childrenItem" />
    </template>
  </SubMenu>
</template>
<script lang="ts">
  import type { Menu as MenuType } from '/@/router/types';
  import { defineComponent, computed } from 'vue';
  import { Menu } from 'ant-design-vue';
  import { useDesign } from '/@/hooks/web/useDesign';
  import { checkChildrenHidden } from '/@/utils/common/compUtils';
  import { itemProps } from '../props';
  import BasicMenuItem from './BasicMenuItem.vue';
  import MenuItemContent from './MenuItemContent.vue';

  export default defineComponent({
    name: 'BasicSubMenuItem',
    isSubMenu: true,
    components: {
      BasicMenuItem,
      SubMenu: Menu.SubMenu,
      MenuItemContent,
    },
    props: itemProps,
    setup(props) {
      const { prefixCls } = useDesign('basic-menu-item');
      const menuTestId = computed(() => {
        const raw = props.item?.path || props.item?.name || props.item?.title || 'menu';
        return `menu-item-${String(raw).replace(/[^a-zA-Z0-9_-]+/g, '-')}`;
      });

      const getShowMenu = computed(() => !props.item.meta?.hideMenu);
      function menuHasChildren(menuTreeItem: MenuType): boolean {
        return (
          !menuTreeItem.meta?.hideChildrenInMenu &&
          Reflect.has(menuTreeItem, 'children') &&
          !!menuTreeItem.children &&
          menuTreeItem.children.length > 0
          &&checkChildrenHidden(menuTreeItem)
        );
      }
      return {
        prefixCls,
        menuTestId,
        menuHasChildren,
        checkChildrenHidden,
        getShowMenu,
      };
    },
  });
</script>
