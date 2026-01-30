-- Purpose: Create tr_proc_var_map for form field -> process variable mapping (Stage3 MVP-1)
CREATE TABLE IF NOT EXISTS `tr_proc_var_map` (
  `id` varchar(32) NOT NULL,
  `form_key` varchar(64) NOT NULL,
  `field_key` varchar(128) NOT NULL,
  `var_name` varchar(128) NOT NULL,
  `value_type` varchar(32) DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `created_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(64) DEFAULT NULL,
  `updated_time` datetime DEFAULT NULL,
  `updated_by` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_form_field` (`form_key`, `field_key`),
  KEY `idx_form_key` (`form_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
