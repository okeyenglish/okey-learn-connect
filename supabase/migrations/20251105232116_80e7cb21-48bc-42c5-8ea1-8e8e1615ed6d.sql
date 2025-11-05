-- Allow multiple WhatsApp sessions per organization
-- Drop the unique constraint on organization_id to allow multiple sessions per org
ALTER TABLE public.whatsapp_sessions DROP CONSTRAINT IF EXISTS whatsapp_sessions_organization_id_key;

-- Add index on organization_id for better query performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_organization_id ON public.whatsapp_sessions(organization_id);