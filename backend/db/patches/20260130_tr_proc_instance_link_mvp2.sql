-- Purpose: Create tr_proc_instance_link for process instance linkage (Stage3 MVP-2)
CREATE TABLE IF NOT EXISTS `tr_proc_instance_link` (
  `id` varchar(32) NOT NULL,
  `process_instance_id` varchar(64) NOT NULL,
  `process_definition_key` varchar(128) NOT NULL,
  `business_key` varchar(256) DEFAULT NULL,
  `form_key` varchar(64) NOT NULL,
  `record_id` varchar(64) NOT NULL,
  `schema_version` int DEFAULT NULL,
  `created_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_proc_instance` (`process_instance_id`),
  KEY `idx_record_id` (`record_id`),
  KEY `idx_form_record` (`form_key`, `record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
