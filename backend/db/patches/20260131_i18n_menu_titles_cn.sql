-- Purpose: Internationalize BPM and VForm menus to Chinese (Update by ID)
-- Created: 2026-01-31

-- BPM Center
UPDATE sys_permission SET name = '审批中心' WHERE id = '9f1b2c3d4e5f60718293a4b5c6d7e8f1';
-- Process Definitions
UPDATE sys_permission SET name = '流程定义' WHERE id = '9f1b2c3d4e5f60718293a4b5c6d7e8f2';
-- Form Bindings
UPDATE sys_permission SET name = '表单绑定' WHERE id = '9f1b2c3d4e5f60718293a4b5c6d7e8f3';
-- Start From Form
UPDATE sys_permission SET name = '按表单发起' WHERE id = '9f1b2c3d4e5f60718293a4b5c6d7e8f4';
-- My Tasks
UPDATE sys_permission SET name = '我的待办' WHERE id = '9f1b2c3d4e5f60718293a4b5c6d7e8f5';

-- Form Designer
UPDATE sys_permission SET name = '表单设计器' WHERE id = '6312b6f5fd1011f0a332d6fe3cabb6d4';
