SET NAMES utf8mb4;

-- Add '我发起的' menu under '审批中心' (Idempotent by ID)
INSERT INTO sys_permission (id, parent_id, name, url, component, component_name, menu_type, perms, perms_type, sort_no, always_show, icon, is_route, is_leaf, keep_alive, hidden, description, create_by, create_time, update_by, update_time, del_flag, rule_flag, status, internal_or_external)
VALUES (
    '9f1b2c3d4e5f60718293a4b5c6d7e8f6', -- id
    '9f1b2c3d4e5f60718293a4b5c6d7e8f1', -- parent_id
    '我发起的', -- name
    '/bpm/my', -- url
    'bpm/my/index', -- component
    'bpm-my', -- component_name
    1, -- menu_type
    NULL, -- perms
    '1', -- perms_type
    4, -- sort_no
    0, -- always_show
    NULL, -- icon
    1, -- is_route
    1, -- is_leaf
    0, -- keep_alive
    0, -- hidden
    NULL, -- description
    'admin', -- create_by
    NOW(), -- create_time
    'admin', -- update_by
    NOW(), -- update_time
    0, -- del_flag
    0, -- rule_flag
    '1', -- status
    0 -- internal_or_external
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    url = VALUES(url),
    component = VALUES(component),
    component_name = VALUES(component_name),
    parent_id = VALUES(parent_id),
    sort_no = VALUES(sort_no),
    update_time = NOW();

-- Bind '我发起的' menu to admin role (Idempotent)
INSERT IGNORE INTO sys_role_permission (id, role_id, permission_id, data_rule_ids, operate_date, operate_ip)
SELECT
    REPLACE(UUID(), '-', ''), -- id
    (SELECT id FROM sys_role WHERE role_code = 'admin'), -- role_id
    '9f1b2c3d4e5f60718293a4b5c6d7e8f6', -- permission_id
    NULL, -- data_rule_ids
    NOW(), -- operate_date
    '127.0.0.1' -- operate_ip
WHERE NOT EXISTS (
    SELECT 1 FROM sys_role_permission 
    WHERE role_id = (SELECT id FROM sys_role WHERE role_code = 'admin') 
      AND permission_id = '9f1b2c3d4e5f60718293a4b5c6d7e8f6'
);