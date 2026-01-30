-- Purpose: Create process registry and form-process binding tables (Stage3 MVP-4)
CREATE TABLE IF NOT EXISTS `tr_proc_def_registry` (
  `id` varchar(32) NOT NULL,
  `process_definition_key` varchar(128) NOT NULL,
  `name` varchar(256) DEFAULT NULL,
  `category` varchar(128) DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(64) DEFAULT NULL,
  `updated_time` datetime DEFAULT NULL,
  `updated_by` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_proc_def_key` (`process_definition_key`),
  KEY `idx_proc_def_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `tr_form_proc_bind` (
  `id` varchar(32) NOT NULL,
  `form_key` varchar(64) NOT NULL,
  `process_definition_key` varchar(128) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `is_default` tinyint(1) NOT NULL DEFAULT 1,
  `created_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(64) DEFAULT NULL,
  `updated_time` datetime DEFAULT NULL,
  `updated_by` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_form_process` (`form_key`, `process_definition_key`),
  UNIQUE KEY `uniq_form_default` (`form_key`, `is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
