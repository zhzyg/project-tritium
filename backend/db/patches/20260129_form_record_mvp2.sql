-- Purpose: Create form_record table for form runtime submissions (MVP-2).
-- Rollback:
--   DROP TABLE IF EXISTS form_record;

CREATE TABLE IF NOT EXISTS form_record (
  id varchar(32) NOT NULL,
  form_key varchar(128) NOT NULL,
  schema_version int NOT NULL,
  data_json longtext NOT NULL,
  status tinyint NOT NULL DEFAULT 0,
  created_by varchar(64) NULL,
  created_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time datetime NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_form_record_key_time (form_key, created_time),
  KEY idx_form_record_key_version (form_key, schema_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
