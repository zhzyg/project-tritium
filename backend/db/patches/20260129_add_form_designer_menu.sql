-- Purpose: Add /form/designer menu permission for VForm designer (BACK mode) and bind to admin.
-- Rollback:
--   DELETE FROM sys_role_permission WHERE permission_id = '6312b6f5fd1011f0a332d6fe3cabb6d4';
--   DELETE FROM sys_permission WHERE id = '6312b6f5fd1011f0a332d6fe3cabb6d4';

INSERT INTO sys_permission (
  id,
  parent_id,
  name,
  url,
  component,
  is_route,
  menu_type,
  perms,
  perms_type,
  sort_no,
  always_show,
  icon,
  is_leaf,
  keep_alive,
  hidden,
  hide_tab,
  description,
  create_by,
  create_time,
  update_by,
  update_time,
  del_flag,
  rule_flag,
  status,
  internal_or_external
) VALUES (
  '6312b6f5fd1011f0a332d6fe3cabb6d4',
  '1455100420297859074',
  'Form Designer',
  '/form/designer',
  'form/designer/index',
  1,
  1,
  NULL,
  0,
  4.00,
  0,
  NULL,
  1,
  0,
  0,
  0,
  NULL,
  'admin',
  NOW(),
  'admin',
  NOW(),
  0,
  0,
  '1',
  0
);

INSERT INTO sys_role_permission (
  id,
  role_id,
  permission_id,
  data_rule_ids,
  operate_date,
  operate_ip
) VALUES (
  '6312b712fd1011f0a332d6fe3cabb6d4',
  'f6817f48af4fb3af11b9e8bf182f618b',
  '6312b6f5fd1011f0a332d6fe3cabb6d4',
  NULL,
  NOW(),
  '127.0.0.1'
);
