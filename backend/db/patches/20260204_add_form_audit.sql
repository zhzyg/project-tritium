-- MVP-8B v0: minimal audit table for BPM task comments
CREATE TABLE IF NOT EXISTS tr_form_audit (
  id VARCHAR(32) PRIMARY KEY,
  form_key VARCHAR(128) NOT NULL,
  record_id VARCHAR(64) NOT NULL,
  process_instance_id VARCHAR(64),
  task_id VARCHAR(64),
  action VARCHAR(32),
  comment VARCHAR(1024),
  created_by VARCHAR(64),
  created_time DATETIME
);
