-- Fix: Translate Form Runtime menu to Chinese
-- Created: 2026-01-31

SET NAMES utf8mb4;
UPDATE sys_permission SET name = '表单运行' WHERE id = 'ecf19b1dfd2111f0a332d6fe3cabb6d4';
