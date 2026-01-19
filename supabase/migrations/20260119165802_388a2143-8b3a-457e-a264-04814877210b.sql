-- Add progress tracking columns for group tests import (step 16)
ALTER TABLE holihope_import_progress 
ADD COLUMN IF NOT EXISTS group_tests_skip INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS group_tests_total_imported INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS group_tests_is_running BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS group_tests_last_updated_at TIMESTAMPTZ;