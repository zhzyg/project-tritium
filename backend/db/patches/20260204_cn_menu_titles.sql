SET NAMES utf8mb4;

-- Normalize menu titles to Chinese (menu names only; perms/url unchanged).
UPDATE sys_permission SET name = '应用运行'
  WHERE id = '9f1b2c3d4e5f60718293a4b5c6d7e8f8' OR name = 'App Runtime';

UPDATE sys_permission SET name = '审批中心'
  WHERE id = '9f1b2c3d4e5f60718293a4b5c6d7e8f1' OR name = 'BPM Center';

UPDATE sys_permission SET name = '流程定义'
  WHERE id = '9f1b2c3d4e5f60718293a4b5c6d7e8f2' OR name = 'Process Definitions';

UPDATE sys_permission SET name = '表单绑定'
  WHERE id = '9f1b2c3d4e5f60718293a4b5c6d7e8f3' OR name = 'Form Bindings';

UPDATE sys_permission SET name = '流程发起'
  WHERE id = '9f1b2c3d4e5f60718293a4b5c6d7e8f4' OR name = 'Start From Form';

UPDATE sys_permission SET name = '我的待办'
  WHERE id = '9f1b2c3d4e5f60718293a4b5c6d7e8f5' OR name = 'My Tasks';

UPDATE sys_permission SET name = '表单设计器'
  WHERE id = '6312b6f5fd1011f0a332d6fe3cabb6d4' OR name = 'Form Designer';

UPDATE sys_permission SET name = '仪表盘'
  WHERE name = 'Dashboard';
