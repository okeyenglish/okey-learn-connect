-- =============================================
-- Chat Messages table for messenger
-- =============================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Message content
  content TEXT,
  message_type TEXT DEFAULT 'text',
  media_url TEXT,
  media_type TEXT,
  file_name TEXT,
  
  -- Direction and status
  direction TEXT NOT NULL DEFAULT 'incoming',
  status TEXT DEFAULT 'sent',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Messenger info
  messenger TEXT,
  external_id TEXT,
  reply_to_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  
  -- Sender info
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_name TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_messages_org ON public.chat_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_client ON public.chat_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.chat_messages(client_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_messages_external ON public.chat_messages(external_id);
CREATE INDEX IF NOT EXISTS idx_messages_messenger ON public.chat_messages(messenger);

-- =============================================
-- Updated_at trigger
-- =============================================
CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Enable RLS
-- =============================================
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies
-- =============================================

-- Users can view messages in their organization
CREATE POLICY "Users can view messages in their organization"
ON public.chat_messages FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization_id());

-- Users can create messages in their organization
CREATE POLICY "Users can create messages in their organization"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (organization_id = public.get_user_organization_id());

-- Users can update messages in their organization
CREATE POLICY "Users can update messages in their organization"
ON public.chat_messages FOR UPDATE
TO authenticated
USING (organization_id = public.get_user_organization_id());

-- Admins can delete messages
CREATE POLICY "Admins can delete messages"
ON public.chat_messages FOR DELETE
TO authenticated
USING (organization_id = public.get_user_organization_id() AND public.is_admin());

-- Service role full access (for webhooks)
CREATE POLICY "Service role full access to messages"
ON public.chat_messages FOR ALL
TO service_role
USING (true);

-- =============================================
-- Enable realtime
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- =============================================
-- Helper function: update client last_message_at
-- =============================================
CREATE OR REPLACE FUNCTION public.update_client_last_message_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    UPDATE public.clients
    SET last_message_at = NEW.created_at
    WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_client_last_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_client_last_message_at();