-- Add progress tracking fields for ed_unit_students (Step 13)
ALTER TABLE public.holihope_import_progress
ADD COLUMN IF NOT EXISTS ed_unit_students_skip integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ed_unit_students_total_imported integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ed_unit_students_is_running boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ed_unit_students_last_updated_at timestamptz;