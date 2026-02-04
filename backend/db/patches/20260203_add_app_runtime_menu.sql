SET NAMES utf8mb4;

-- 添加“应用运行”顶级菜单
INSERT INTO sys_permission (
  id, parent_id, name, url, component, is_route, menu_type, perms, perms_type, sort_no, 
  always_show, icon, is_leaf, keep_alive, hidden, hide_tab, description, 
  create_by, create_time, update_by, update_time, del_flag, rule_flag, status, internal_or_external
) VALUES (
  '9f1b2c3d4e5f60718293a4b5c6d7e8f8', '', '应用运行', '/form/runtime', 'layouts/RouteView', 1, 0, NULL, 0, 9.00, 0, 'ant-design:appstore-outlined', 0, 0, 0, 0, '运行表单入口', 'admin', NOW(), 'admin', NOW(), 0, 0, '1', 0
) ON DUPLICATE KEY UPDATE name = VALUES(name), url = VALUES(url), update_time = NOW();

-- Bind to admin role
INSERT IGNORE INTO sys_role_permission (id, role_id, permission_id, data_rule_ids, operate_date, operate_ip)
SELECT REPLACE(UUID(), '-', ''), (SELECT id FROM sys_role WHERE role_code = 'admin' LIMIT 1), '9f1b2c3d4e5f60718293a4b5c6d7e8f8', NULL, NOW(), '127.0.0.1'
FROM dual
WHERE NOT EXISTS (
    SELECT 1 FROM sys_role_permission WHERE role_id = (SELECT id FROM sys_role WHERE role_code = 'admin' LIMIT 1) AND permission_id = '9f1b2c3d4e5f60718293a4b5c6d7e8f8'
);
