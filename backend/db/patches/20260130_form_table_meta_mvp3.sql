-- Purpose: Create form_table_meta and form_field_meta for JSON->DDL publishing (MVP-3A).
-- Rollback:
--   DROP TABLE IF EXISTS form_field_meta;
--   DROP TABLE IF EXISTS form_table_meta;

CREATE TABLE IF NOT EXISTS form_table_meta (
  id varchar(32) NOT NULL,
  form_key varchar(128) NOT NULL,
  table_name varchar(128) NOT NULL,
  schema_version int NOT NULL,
  status tinyint NOT NULL DEFAULT 1,
  created_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time datetime NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_form_table_meta_key_version (form_key, schema_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS form_field_meta (
  id varchar(32) NOT NULL,
  form_key varchar(128) NOT NULL,
  schema_version int NOT NULL,
  field_key varchar(128) NOT NULL,
  label varchar(255) NULL,
  widget_type varchar(64) NULL,
  db_column varchar(128) NOT NULL,
  db_type varchar(64) NOT NULL,
  db_length int NULL,
  nullable tinyint NOT NULL DEFAULT 1,
  default_value varchar(255) NULL,
  status tinyint NOT NULL DEFAULT 1,
  created_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_form_field_meta_key (form_key, schema_version, field_key),
  KEY idx_form_field_meta_key_version (form_key, schema_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
