-- Add column for manual restart requirement when API limit is reached
ALTER TABLE salebot_import_progress 
ADD COLUMN IF NOT EXISTS requires_manual_restart BOOLEAN NOT NULL DEFAULT false;

-- Add comment explaining the column
COMMENT ON COLUMN salebot_import_progress.requires_manual_restart IS 'When true, import cannot auto-restart and requires manual intervention. Set when API rate limit is hit.';