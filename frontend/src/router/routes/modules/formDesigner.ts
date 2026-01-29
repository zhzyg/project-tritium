import type { AppRouteModule } from '/@/router/types';

import { LAYOUT } from '/@/router/constant';

const formDesigner: AppRouteModule = {
  path: '/form',
  name: 'Form',
  component: LAYOUT,
  redirect: '/form/designer',
  meta: {
    orderNo: 9000,
    icon: 'mdi:form-select',
    title: '表单设计器（VForm）',
  },
  children: [
    {
      path: 'designer',
      name: 'FormDesigner',
      component: () => import('/@/views/form/designer/index.vue'),
      meta: {
        title: '表单设计器（VForm）',
      },
    },
    {
      path: 'runtime',
      name: 'FormRuntime',
      component: () => import('/@/views/form/runtime/index.vue'),
      meta: {
        title: '表单运行态（VForm）',
      },
    },
  ],
};

export default formDesigner;
