import type { AppRouteModule } from '/@/router/types';

import { LAYOUT } from '/@/router/constant';

const bpm: AppRouteModule = {
  path: '/bpm',
  name: 'Bpm',
  component: LAYOUT,
  redirect: '/bpm/tasks',
  meta: {
    orderNo: 800,
    title: 'BPM Center',
  },
  children: [
    {
      path: 'defs',
      name: 'BpmDefs',
      component: () => import('/@/views/bpm/defs/index.vue'),
      meta: {
        title: 'Process Definitions',
      },
    },
    {
      path: 'bind',
      name: 'BpmBind',
      component: () => import('/@/views/bpm/bind/index.vue'),
      meta: {
        title: 'Form Bindings',
      },
    },
    {
      path: 'start',
      name: 'BpmStart',
      component: () => import('/@/views/bpm/start/index.vue'),
      meta: {
        title: 'Start From Form',
      },
    },
    {
      path: 'tasks',
      name: 'BpmTasks',
      component: () => import('/@/views/bpm/tasks/index.vue'),
      meta: {
        title: 'My Tasks',
      },
    },
  ],
};

export default bpm;
