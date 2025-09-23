-- Add optional SIP WebSocket settings to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS sip_ws_url TEXT,
ADD COLUMN IF NOT EXISTS sip_transport TEXT;

-- No changes to RLS needed; fields are user-managed within existing policies.
