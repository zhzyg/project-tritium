import type { AppRouteModule } from '/@/router/types';
import { LAYOUT } from '/@/router/constant';

const formRuntime: AppRouteModule = {
  path: '/form/runtime',
  name: 'FormRuntime',
  component: LAYOUT,
  redirect: '/form/runtime/list',
  meta: {
    orderNo: 100,
    icon: 'ant-design:appstore-outlined',
    title: '应用运行',
    hideChildrenInMenu: false,
  },
  children: [
    {
      path: ':formKey/list',
      name: 'FormDataList',
      component: () => import('/@/views/form/runtime/FormDataList.vue'),
      meta: {
        title: '数据列表',
        hideMenu: true, // Only show specific forms via DB menus
      },
    },
    {
      path: ':formKey/view',
      name: 'FormDataView',
      component: () => import('/@/views/form/runtime/FormDataList.vue'), // Placeholder
      meta: {
        title: '查看数据',
        hideMenu: true,
      },
    },
  ],
};

export default formRuntime;
