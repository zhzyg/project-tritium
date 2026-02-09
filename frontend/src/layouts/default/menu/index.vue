<script lang="tsx">
  import type { PropType, CSSProperties } from 'vue';

  import { computed, defineComponent, unref, toRef, ref, watch } from 'vue';
  import { BasicMenu } from '/@/components/Menu';
  import { SimpleMenu } from '/@/components/SimpleMenu';
  import { AppLogo } from '/@/components/Application';
  import { Button } from 'ant-design-vue';
  import draggable from 'vuedraggable';

  import { MenuModeEnum, MenuSplitTyeEnum } from '/@/enums/menuEnum';

  import { useMenuSetting } from '/@/hooks/setting/useMenuSetting';
  import { ScrollContainer } from '/@/components/Container';

  import { useGo } from '/@/hooks/web/usePage';
  import { useSplitMenu } from './useLayoutMenu';
  import { openWindow } from '/@/utils';
  import { propTypes } from '/@/utils/propTypes';
  import { isUrl } from '/@/utils/is';
  import { useRootSetting } from '/@/hooks/setting/useRootSetting';
  import { useAppInject } from '/@/hooks/web/useAppInject';
  import { useDesign } from '/@/hooks/web/useDesign';
  import { useLocaleStore } from '/@/store/modules/locale';

  export default defineComponent({
    name: 'LayoutMenu',
    components: { draggable },
    props: {
      theme: propTypes.oneOf(['light', 'dark']),

      splitType: {
        type: Number as PropType<MenuSplitTyeEnum>,
        default: MenuSplitTyeEnum.NONE,
      },

      isHorizontal: propTypes.bool,
      // menu Mode
      menuMode: {
        type: [String] as PropType<Nullable<MenuModeEnum>>,
        default: '',
      },
    },
    setup(props) {
      const go = useGo();

      const {
        getMenuMode,
        getMenuType,
        getMenuTheme,
        getCollapsed,
        getCollapsedShowTitle,
        getAccordion,
        getIsHorizontal,
        getIsSidebarType,
        getSplit,
      } = useMenuSetting();
      const { getShowLogo } = useRootSetting();

      const { prefixCls } = useDesign('layout-menu');

      const { menusRef } = useSplitMenu(toRef(props, 'splitType'));

      const { getIsMobile } = useAppInject();

      // -- MVP-10A Edit Mode State --
      const isEditMode = ref(false);
      const localMenus = ref<any[]>([]);

      const getComputedMenuMode = computed(() => (unref(getIsMobile) ? MenuModeEnum.INLINE : props.menuMode || unref(getMenuMode)));

      const getComputedMenuTheme = computed(() => props.theme || unref(getMenuTheme));

      const getIsShowLogo = computed(() => unref(getShowLogo) && unref(getIsSidebarType));

      const getUseScroll = computed(() => {
        return (
          !unref(getIsHorizontal) &&
          (unref(getIsSidebarType) || props.splitType === MenuSplitTyeEnum.LEFT || props.splitType === MenuSplitTyeEnum.NONE)
        );
      });

      const getWrapperStyle = computed((): CSSProperties => {
        return {
          height: `calc(100% - ${unref(getIsShowLogo) ? '48px' : '0px'})`,
        };
      });

      const getLogoClass = computed(() => {
        return [
          `${prefixCls}-logo`,
          unref(getComputedMenuTheme),
          {
            [`${prefixCls}--mobile`]: unref(getIsMobile),
          },
        ];
      });

      const getCommonProps = computed(() => {
        const menus = unref(menusRef);
        return {
          menus,
          beforeClickFn: beforeMenuClickFn,
          items: menus,
          theme: unref(getComputedMenuTheme),
          accordion: unref(getAccordion),
          collapse: unref(getCollapsed),
          collapsedShowTitle: unref(getCollapsedShowTitle),
          onMenuClick: handleMenuClick,
        };
      });
      /**
       * click menu
       * @param menu
       */
      //update-begin-author:taoyan date:2022-6-1 for: VUEN-1144 online 配置成菜单后，打开菜单，显示名称未展示为菜单名称
      const localeStore = useLocaleStore();
      function handleMenuClick(path: string, item) {
        if (item) {
          localeStore.setPathTitle(path, item.title || '');
        }
        go(path);
      }
      //update-end-author:taoyan date:2022-6-1 for: VUEN-1144 online 配置成菜单后，打开菜单，显示名称未展示为菜单名称

      /**
       * before click menu
       * @param menu
       */
      async function beforeMenuClickFn(path: string) {
        if (!isUrl(path)) {
          return true;
        }
        openWindow(path);
        return false;
      }

      function renderHeader() {
        if (!unref(getIsShowLogo) && !unref(getIsMobile)) return null;

        return <AppLogo showTitle={!unref(getCollapsed)} class={unref(getLogoClass)} theme={unref(getComputedMenuTheme)} />;
      }

      // -- MVP-10A Actions --
      function toggleEditMode() {
        isEditMode.value = !isEditMode.value;
        if (isEditMode.value) {
          localMenus.value = [...unref(menusRef)];
        }
      }

      function handleReset() {
        localMenus.value = [...unref(menusRef)];
      }

      function renderActions() {
        if (unref(getIsHorizontal) || unref(getCollapsed)) return null; // Hide in horizontal or collapsed
        
        const isDark = unref(getComputedMenuTheme) === 'dark';
        const textColor = isDark ? 'text-white' : 'text-black';
        
        return (
          <div class="px-2 py-1 text-center border-b border-gray-600 border-opacity-20" style="min-height: 40px; display: flex; align-items: center; justify-content: center;">
             {!isEditMode.value ? (
                <Button size="small" type={isDark ? 'ghost' : 'dashed'} class={isDark ? '!text-white !border-white !border-opacity-50' : ''} onClick={toggleEditMode} data-testid="btn-menu-edit-toggle">调整菜单</Button>
             ) : (
                <div class="space-x-2">
                   <Button size="small" type="primary" onClick={toggleEditMode}>完成</Button>
                   <Button size="small" onClick={handleReset} data-testid="btn-menu-reset">恢复默认</Button>
                </div>
             )}
          </div>
        );
      }

      function renderDraggableMenu() {
        const isDark = unref(getComputedMenuTheme) === 'dark';
        const itemClass = `p-3 border-b flex items-center ${isDark ? 'bg-[#001529] text-white border-gray-700' : 'bg-white text-black border-gray-100'}`;
        const handleClass = `drag-handle cursor-move mr-2 text-lg ${isDark ? 'text-gray-400' : 'text-gray-500'}`;

        return (
          <draggable
            list={localMenus.value}
            itemKey="path"
            handle=".drag-handle"
            animation={300}
            class="flex flex-col w-full"
            data-testid="sidebar-edit-list"
          >
            {{
              item: ({ element }) => (
                <div class={itemClass} data-testid={`sidebar-edit-item-${element.path}`}>
                  <span class={handleClass} data-testid={`sidebar-edit-handle-${element.path}`}>≡</span>
                  <span class="flex-1 truncate select-none">{element.meta?.title || element.name}</span>
                </div>
              )
            }}
          </draggable>
        );
      }

      function renderMenu() {
        const { menus, ...menuProps } = unref(getCommonProps);
        // console.log(menus);
        if (!menus || !menus.length) return null;
        return !props.isHorizontal ? (
          <SimpleMenu {...menuProps} isSplitMenu={unref(getSplit)} items={menus} />
        ) : (
          <BasicMenu
            {...(menuProps as any)}
            isHorizontal={props.isHorizontal}
            type={unref(getMenuType)}
            showLogo={unref(getIsShowLogo)}
            mode={unref(getComputedMenuMode as any)}
            items={menus}
          />
        );
      }

      return () => {
        return (
          <div data-testid="sidebar" class="h-full flex flex-col w-full">
            {renderHeader()}
            {renderActions()}
            {unref(getUseScroll) ? 
              <ScrollContainer style={unref(getWrapperStyle)}>
                {() => (isEditMode.value ? renderDraggableMenu() : renderMenu())}
              </ScrollContainer> 
              : 
              (isEditMode.value ? renderDraggableMenu() : renderMenu())
            }
          </div>
        );
      };
    },
  });
</script>
<style lang="less" scoped>
  // update-begin--author:liaozhiyang---date:20230803---for：【QQYUN-5872】菜单优化，上下滚动条去掉
  .scroll-container :deep(.scrollbar__bar) {
    display: none;
  }
  // update-end--author:liaozhiyang---date:20230803---for：【QQYUN-5872】菜单优化，上下滚动条去掉
</style>
<style lang="less">
  @prefix-cls: ~'@{namespace}-layout-menu';
  @logo-prefix-cls: ~'@{namespace}-app-logo';

  .@{prefix-cls} {
    &-logo {
      height: @header-height;
      padding: 10px 4px 10px 10px;

      img {
        width: @logo-width;
        height: @logo-width;
      }
    }

    &--mobile {
      .@{logo-prefix-cls} {
        &__title {
          opacity: 1;
        }
      }
    }
  }
</style>
