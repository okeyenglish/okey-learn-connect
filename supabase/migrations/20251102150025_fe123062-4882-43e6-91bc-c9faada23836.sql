-- Create table for WhatsApp sessions per organization
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'qr_issued', 'pairing')),
  last_qr_b64 TEXT,
  last_qr_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id),
  UNIQUE(session_name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_org ON public.whatsapp_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_name ON public.whatsapp_sessions(session_name);

-- Enable RLS
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only see/manage their organization's session
CREATE POLICY "Users can view their organization's WhatsApp session"
  ON public.whatsapp_sessions FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert their organization's WhatsApp session"
  ON public.whatsapp_sessions FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their organization's WhatsApp session"
  ON public.whatsapp_sessions FOR UPDATE
  USING (organization_id = get_user_organization_id());

-- Trigger to update updated_at
CREATE TRIGGER update_whatsapp_sessions_updated_at
  BEFORE UPDATE ON public.whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();