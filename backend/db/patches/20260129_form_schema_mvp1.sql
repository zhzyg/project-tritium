-- Purpose: Create form_schema table for VForm schema persistence (MVP-1).
-- Rollback:
--   DROP TABLE IF EXISTS form_schema;

CREATE TABLE IF NOT EXISTS form_schema (
  id varchar(32) NOT NULL,
  form_key varchar(128) NOT NULL,
  version int NOT NULL,
  schema_json longtext NOT NULL,
  status tinyint NOT NULL DEFAULT 0,
  created_by varchar(64) NULL,
  created_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time datetime NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_form_schema_key_version (form_key, version),
  KEY idx_form_schema_key_time (form_key, created_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
