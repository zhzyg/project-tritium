import type { AppRouteModule } from '/@/router/types';

import { LAYOUT } from '/@/router/constant';

const bpm: AppRouteModule = {
  path: '/bpm',
  name: 'Bpm',
  component: LAYOUT,
  redirect: '/bpm/tasks',
  meta: {
    orderNo: 800,
    title: '审批中心',
  },
  children: [
    {
      path: 'defs',
      name: 'BpmDefs',
      component: () => import('/@/views/bpm/defs/index.vue'),
      meta: {
        title: '流程定义',
      },
    },
    {
      path: 'bind',
      name: 'BpmBind',
      component: () => import('/@/views/bpm/bind/index.vue'),
      meta: {
        title: '表单绑定',
      },
    },
    {
      path: 'start',
      name: 'BpmStart',
      component: () => import('/@/views/bpm/start/index.vue'),
      meta: {
        title: '按表单发起',
      },
    },
    {
      path: 'tasks',
      name: 'BpmTasks',
      component: () => import('/@/views/bpm/tasks/index.vue'),
      meta: {
        title: '我的待办',
      },
    },
  ],
};

export default bpm;
