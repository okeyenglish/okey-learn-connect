-- Add salebot_client_id column to clients for efficient resync
ALTER TABLE clients ADD COLUMN IF NOT EXISTS salebot_client_id BIGINT;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_clients_salebot_client_id ON clients(salebot_client_id) WHERE salebot_client_id IS NOT NULL;

-- Add resync tracking fields to salebot_import_progress
ALTER TABLE salebot_import_progress 
  ADD COLUMN IF NOT EXISTS resync_offset INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resync_total_clients INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resync_new_messages INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resync_mode BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN clients.salebot_client_id IS 'Salebot client ID for direct API calls during resync';