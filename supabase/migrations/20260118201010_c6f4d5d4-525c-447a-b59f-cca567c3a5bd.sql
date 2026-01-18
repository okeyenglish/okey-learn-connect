-- Add ed_units progress fields to holihope_import_progress table
ALTER TABLE public.holihope_import_progress
ADD COLUMN IF NOT EXISTS ed_units_office_index integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ed_units_status_index integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ed_units_time_index integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ed_units_total_imported integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ed_units_total_combinations integer DEFAULT 1615,
ADD COLUMN IF NOT EXISTS ed_units_is_running boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ed_units_last_updated_at timestamp with time zone;

-- Add comment for clarity
COMMENT ON COLUMN public.holihope_import_progress.ed_units_office_index IS 'Current office index for educational units import (0-based)';
COMMENT ON COLUMN public.holihope_import_progress.ed_units_status_index IS 'Current status index (0-4: Reserve, Forming, Working, Stopped, Finished)';
COMMENT ON COLUMN public.holihope_import_progress.ed_units_time_index IS 'Current time range index (0-16: 06:00-23:00 hourly)';
COMMENT ON COLUMN public.holihope_import_progress.ed_units_is_running IS 'Whether ed_units import is currently in progress';