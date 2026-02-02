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
    {
      path: 'approve',
      name: 'BpmApprove',
      component: () => import('/@/views/bpm/approve/index.vue'),
      meta: { title: '审批页面' },
    },
    {
      path: 'done',
      name: 'bpm-done',
      component: () => import('/@/views/bpm/done/index.vue'),
      meta: { title: '已办任务' },
    },
    {
      path: 'my',
      name: 'bpm-my',
      component: () => import('/@/views/bpm/my/index.vue'),
      meta: { title: '我发起的' },
    },
    {
      path: 'process/view',
      name: 'bpm-process-view',
      component: () => import('/@/views/bpm/process/view/index.vue'),
      meta: {
        title: '流程查看',
        hideMenu: true,
      },
    },
  ],
};

export default bpm;
