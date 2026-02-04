SET NAMES utf8mb4;

-- Purpose: add per-process start permission code for BPM start (MVP-7D).
-- Rollback:
--   ALTER TABLE tr_form_proc_bind DROP COLUMN start_perm_code;

ALTER TABLE tr_form_proc_bind
  ADD COLUMN start_perm_code varchar(128) DEFAULT NULL AFTER is_default;

-- Configure start permission for a known process key
UPDATE tr_form_proc_bind
SET start_perm_code = 'bpm:start:TRITIUM_APPROVAL_V1',
    updated_time = NOW()
WHERE process_definition_key = 'TRITIUM_APPROVAL_V1'
  AND (start_perm_code IS NULL OR start_perm_code = '');

-- Add button permission for the process-level code (Idempotent by ID)
INSERT INTO sys_permission (id, parent_id, name, url, component, component_name, menu_type, perms, perms_type, sort_no, always_show, icon, is_route, is_leaf, keep_alive, hidden, description, create_by, create_time, update_by, update_time, del_flag, rule_flag, status, internal_or_external)
VALUES (
    '9f1b2c3d4e5f60718293a4b5c6d7e911', -- id
    '9f1b2c3d4e5f60718293a4b5c6d7e8f4', -- parent_id (/bpm/start)
    '发起流程（审批流程）', -- name
    '', -- url
    '', -- component
    NULL, -- component_name
    2, -- menu_type (button)
    'bpm:start:TRITIUM_APPROVAL_V1', -- perms
    '1', -- perms_type (show)
    2.00, -- sort_no
    0, -- always_show
    NULL, -- icon
    0, -- is_route
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
    parent_id = VALUES(parent_id),
    perms = VALUES(perms),
    perms_type = VALUES(perms_type),
    status = VALUES(status),
    update_time = NOW();

-- Bind process-level start permission to admin role (Idempotent)
INSERT IGNORE INTO sys_role_permission (id, role_id, permission_id, data_rule_ids, operate_date, operate_ip)
SELECT
    REPLACE(UUID(), '-', ''),
    (SELECT id FROM sys_role WHERE role_code = 'admin'),
    '9f1b2c3d4e5f60718293a4b5c6d7e911',
    NULL,
    NOW(),
    '127.0.0.1'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_role_permission
    WHERE role_id = (SELECT id FROM sys_role WHERE role_code = 'admin')
      AND permission_id = '9f1b2c3d4e5f60718293a4b5c6d7e911'
);
