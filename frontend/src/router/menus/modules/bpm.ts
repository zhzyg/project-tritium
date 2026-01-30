import type { MenuModule } from '/@/router/types';

const bpmMenu: MenuModule = {
  orderNo: 800,
  menu: {
    name: 'BPM Center',
    path: '/bpm',
    children: [
      {
        name: 'Process Definitions',
        path: 'defs',
      },
      {
        name: 'Form Bindings',
        path: 'bind',
      },
      {
        name: 'Start From Form',
        path: 'start',
      },
      {
        name: 'My Tasks',
        path: 'tasks',
      },
    ],
  },
};

export default bpmMenu;
