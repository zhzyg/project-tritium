SET NAMES utf8mb4;

-- Purpose: store form-level BPMN drafts and published deployment info (MVP-9A).
CREATE TABLE IF NOT EXISTS `tr_form_bpmn` (
  `id` varchar(32) NOT NULL,
  `form_key` varchar(128) NOT NULL,
  `bpmn_xml` longtext,
  `bpmn_hash` varchar(64) DEFAULT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'draft',
  `proc_def_key` varchar(128) DEFAULT NULL,
  `proc_def_id` varchar(128) DEFAULT NULL,
  `deployment_id` varchar(128) DEFAULT NULL,
  `published_time` datetime DEFAULT NULL,
  `created_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(64) DEFAULT NULL,
  `updated_time` datetime DEFAULT NULL,
  `updated_by` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_form_bpmn` (`form_key`),
  KEY `idx_form_bpmn_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
