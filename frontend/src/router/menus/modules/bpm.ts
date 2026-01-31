import type { MenuModule } from '/@/router/types';

const bpmMenu: MenuModule = {
  orderNo: 800,
  menu: {
    name: '审批中心',
    path: '/bpm',
    children: [
      {
        name: '流程定义',
        path: 'defs',
      },
      {
        name: '表单绑定',
        path: 'bind',
      },
      {
        name: '按表单发起',
        path: 'start',
      },
      {
        name: '我的待办',
        path: 'tasks',
      },
    ],
  },
};

export default bpmMenu;
