<template>
  <div :class="prefixCls" data-testid="sidebar-menu-root">
    <div style="text-align: right; padding: 4px;">
      <a-button type="link" size="small" @click="toggleEditing" data-testid="btn-sidebar-menu-edit">
        {{ isEditing ? '完成' : '编辑菜单' }}
      </a-button>
    </div>
    <Menu
      v-bind="getBindValues"
      :activeName="activeName"
      :openNames="getOpenKeys"
      :class="{ 'is-editing': isEditing }"
      :activeSubMenuNames="activeSubMenuNames"
      @select="handleSelect"
    >
      <draggable
        v-model="draggableItems"
        item-key="path"
        :component-data="{ 'data-testid': isEditing ? 'marker-sidebar-editing' : '' }"
        :disabled="!isEditing"
        @end="onDragEnd"
      >
        <template #item="{ element }">
          <SimpleSubMenu
            :item="element"
            :parent="true"
            :collapsedShowTitle="collapsedShowTitle"
            :collapse="collapse"
          />
        </template>
      </draggable>
    </Menu>
  </div>
</template>
<script lang="ts">
  import type { MenuState } from './types';
  import type { Menu as MenuType } from '/@/router/types';
  import type { RouteLocationNormalizedLoaded } from 'vue-router';
  import { defineComponent, computed, ref, unref, reactive, toRefs, watch, provide } from 'vue';
  import { useDesign } from '/@/hooks/web/useDesign';
  import Menu from './components/Menu.vue';
  import SimpleSubMenu from './SimpleSubMenu.vue';
  import { listenerRouteChange } from '/@/logics/mitt/routeChange';
  import { propTypes } from '/@/utils/propTypes';
  import { REDIRECT_NAME } from '/@/router/constant';
  import { useRouter } from 'vue-router';
  import { isFunction, isUrl } from '/@/utils/is';
  import { openWindow } from '/@/utils';
  import draggable from 'vuedraggable';
  import { useOpenKeys } from './useOpenKeys';
  import { URL_HASH_TAB } from '/@/utils';
  import { Button as AButton } from 'ant-design-vue';

  export default defineComponent({
    name: 'SimpleMenu',
    components: {
      Menu,
      SimpleSubMenu,
      draggable,
      AButton,
    },
    inheritAttrs: false,
    props: {
      items: {
        type: Array as PropType<MenuType[]>,
        default: () => [],
      },
      collapse: propTypes.bool,
      mixSider: propTypes.bool,
      theme: propTypes.string,
      accordion: propTypes.bool.def(true),
      collapsedShowTitle: propTypes.bool,
      beforeClickFn: {
        type: Function as PropType<(key: string) => Promise<boolean>>,
      },
      isSplitMenu: propTypes.bool,
    },
    emits: ['menuClick'],
    setup(props, { attrs, emit }) {
      const isEditing = ref(false);
      const draggableItems = ref<MenuType[]>([]);

      provide('isMenuEditing', isEditing);

      watch(
        () => props.items,
        (newItems) => {
          draggableItems.value = JSON.parse(JSON.stringify(newItems));
        },
        { immediate: true }
      );

      function toggleEditing() {
        if (isEditing.value) {
          onSaveLayout();
        }
        isEditing.value = !isEditing.value;
      }

      function onSaveLayout() {
        const layout = {
          top: draggableItems.value.map((item) => item.meta?.permissionId).filter(Boolean),
          children: {},
        };

        draggableItems.value.forEach((item) => {
          if (item.children && item.children.length > 0) {
            const pid = item.meta?.permissionId;
            if (pid) {
              layout.children[pid] = item.children.map((c) => c.meta?.permissionId).filter(Boolean);
            }
          }
        });

        // @ts-ignore
        if (window.axios) {
          // @ts-ignore
          window.axios.post('/sys/menuLayout/saveMine', layout);
        }
      }

      function onDragEnd() {}

      const currentActiveMenu = ref('');
      const isClickGo = ref(false);

      const menuState = reactive<MenuState>({
        activeName: '',
        openNames: [],
        activeSubMenuNames: [],
      });

      const { currentRoute } = useRouter();
      const { prefixCls } = useDesign('simple-menu');
      const { items, accordion, mixSider, collapse } = toRefs(props);

      const { setOpenKeys, getOpenKeys } = useOpenKeys(menuState, items, accordion, mixSider, collapse);

      const getBindValues = computed(() => ({ ...attrs, ...props }));

      watch(
        () => props.collapse,
        (collapse) => {
          if (collapse) {
            menuState.openNames = [];
          } else {
            setOpenKeys(currentRoute.value.path);
          }
        },
        { immediate: true }
      );

      watch(
        () => props.items,
        () => {
          if (!props.isSplitMenu) {
            return;
          }
          setOpenKeys(currentRoute.value.path);
        },
        { flush: 'post' }
      );

      listenerRouteChange((route) => {
        if (route.name === REDIRECT_NAME) return;

        currentActiveMenu.value = route.meta?.currentActiveMenu as string;
        handleMenuChange(route);

        if (unref(currentActiveMenu)) {
          menuState.activeName = unref(currentActiveMenu);
          setOpenKeys(unref(currentActiveMenu));
        }
      });

      async function handleMenuChange(route?: RouteLocationNormalizedLoaded) {
        if (unref(isClickGo)) {
          isClickGo.value = false;
          return;
        }
        const path = (route || unref(currentRoute)).path;

        menuState.activeName = path;

        setOpenKeys(path);
      }

      async function handleSelect(key: string) {
        if (isEditing.value) {
          return;
        }
        if (isUrl(key)) {
          let url = key.replace(URL_HASH_TAB, '#');
          window.open(url);
          return;
        }
        const { beforeClickFn } = props;
        if (beforeClickFn && isFunction(beforeClickFn)) {
          const flag = await beforeClickFn(key);
          if (!flag) return;
        }

        emit('menuClick', key);

        isClickGo.value = true;
        setOpenKeys(key);
        menuState.activeName = key;
      }

      return {
        prefixCls,
        getBindValues,
        handleSelect,
        getOpenKeys,
        ...toRefs(menuState),
        isEditing,
        toggleEditing,
        draggableItems,
        onDragEnd,
      };
    },
  });
</script>
<style lang="less">
  @import './index.less';
  .is-editing {
    .ant-menu-item,
    .ant-menu-submenu-title {
      cursor: move !important;
    }
  }
</style>