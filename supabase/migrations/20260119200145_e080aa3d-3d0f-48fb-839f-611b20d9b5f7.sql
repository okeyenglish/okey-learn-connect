-- Add column to store full_history preference for Step 12
ALTER TABLE holihope_import_progress 
ADD COLUMN IF NOT EXISTS ed_units_full_history boolean DEFAULT false;