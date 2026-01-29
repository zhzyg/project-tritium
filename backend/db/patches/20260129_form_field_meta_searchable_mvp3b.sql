-- Purpose: Add searchable flag for form_field_meta (MVP-3B).
-- Rollback:
--   ALTER TABLE form_field_meta DROP COLUMN searchable;

ALTER TABLE form_field_meta
  ADD COLUMN searchable tinyint NOT NULL DEFAULT 0 AFTER default_value;
