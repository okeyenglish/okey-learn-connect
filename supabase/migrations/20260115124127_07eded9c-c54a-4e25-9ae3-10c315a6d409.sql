-- Add columns for fill_salebot_ids mode tracking
ALTER TABLE public.salebot_import_progress 
ADD COLUMN IF NOT EXISTS fill_ids_mode boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fill_ids_offset integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS fill_ids_total_processed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS fill_ids_total_matched integer DEFAULT 0;