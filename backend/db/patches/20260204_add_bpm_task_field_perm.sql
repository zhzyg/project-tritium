SET NAMES utf8mb4;

-- Purpose: add per-task editable field whitelist table (MVP-8C).
CREATE TABLE IF NOT EXISTS `tr_bpm_task_field_perm` (
  `id` varchar(32) NOT NULL,
  `proc_def_key` varchar(128) NOT NULL,
  `task_def_key` varchar(128) NOT NULL,
  `form_key` varchar(128) NOT NULL,
  `editable_fields_json` text DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `created_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(64) DEFAULT NULL,
  `updated_time` datetime DEFAULT NULL,
  `updated_by` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_proc_task_form` (`proc_def_key`, `task_def_key`, `form_key`),
  KEY `idx_proc_task` (`proc_def_key`, `task_def_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed a sample whitelist using an existing binding (TRITIUM_APPROVAL_V1 -> form_key)
INSERT INTO tr_bpm_task_field_perm (id, proc_def_key, task_def_key, form_key, editable_fields_json, enabled, created_time, created_by)
SELECT
  REPLACE(UUID(), '-', ''),
  'TRITIUM_APPROVAL_V1',
  'applyTask',
  form_key,
  '["reason"]',
  1,
  NOW(),
  'admin'
FROM tr_form_proc_bind
WHERE process_definition_key = 'TRITIUM_APPROVAL_V1'
  AND enabled = 1
LIMIT 1
ON DUPLICATE KEY UPDATE
  editable_fields_json = VALUES(editable_fields_json),
  enabled = VALUES(enabled),
  updated_time = NOW(),
  updated_by = 'admin';
