-- Add fields for detailed import progress tracking
ALTER TABLE public.salebot_import_progress
ADD COLUMN IF NOT EXISTS total_messages_imported INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS estimated_total INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN public.salebot_import_progress.total_messages_imported IS 'Total number of messages imported in current or last run';
COMMENT ON COLUMN public.salebot_import_progress.start_time IS 'Timestamp when the current import started';
COMMENT ON COLUMN public.salebot_import_progress.estimated_total IS 'Estimated total number of clients to process (if known from API)';