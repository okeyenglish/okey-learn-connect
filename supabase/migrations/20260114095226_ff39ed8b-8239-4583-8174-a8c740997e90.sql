-- Phase 1: MAX Channel Integration - Database Schema

-- 1.1 Add 'max' to messenger_type enum
ALTER TYPE messenger_type ADD VALUE IF NOT EXISTS 'max';

-- 1.2 Create max_channels table for bot configurations
CREATE TABLE public.max_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_encrypted TEXT NOT NULL,
  token_iv TEXT NOT NULL,
  token_tag TEXT NOT NULL,
  bot_id BIGINT,
  bot_username TEXT,
  is_enabled BOOLEAN DEFAULT true,
  auto_start BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error', 'starting')),
  last_error TEXT,
  last_heartbeat_at TIMESTAMPTZ,
  messages_today INTEGER DEFAULT 0,
  messages_today_reset_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.3 Add MAX fields to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS max_chat_id TEXT,
ADD COLUMN IF NOT EXISTS max_user_id BIGINT;

-- 1.4 Add max_channel_id to chat_messages
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS max_channel_id UUID REFERENCES max_channels(id) ON DELETE SET NULL;

-- 1.5 Create routing_rules table for message routing and automation
CREATE TABLE public.routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('max', 'whatsapp', 'telegram', 'all')),
  channel_id UUID,
  priority INTEGER DEFAULT 0,
  conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.6 Create max_channel_state for detailed status tracking
CREATE TABLE public.max_channel_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES max_channels(id) ON DELETE CASCADE UNIQUE,
  status TEXT DEFAULT 'offline',
  last_error TEXT,
  last_heartbeat_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  total_messages_received BIGINT DEFAULT 0,
  total_messages_sent BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_max_channels_organization ON max_channels(organization_id);
CREATE INDEX idx_max_channels_status ON max_channels(status);
CREATE INDEX idx_max_channels_is_enabled ON max_channels(is_enabled);
CREATE INDEX idx_clients_max_user_id ON clients(max_user_id) WHERE max_user_id IS NOT NULL;
CREATE INDEX idx_clients_max_chat_id ON clients(max_chat_id) WHERE max_chat_id IS NOT NULL;
CREATE INDEX idx_chat_messages_max_channel ON chat_messages(max_channel_id) WHERE max_channel_id IS NOT NULL;
CREATE INDEX idx_routing_rules_organization ON routing_rules(organization_id);
CREATE INDEX idx_routing_rules_channel_type ON routing_rules(channel_type);
CREATE INDEX idx_routing_rules_priority ON routing_rules(priority DESC);

-- Enable RLS
ALTER TABLE public.max_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.max_channel_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for max_channels
CREATE POLICY "Users can view max_channels in their organization"
ON public.max_channels FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert max_channels in their organization"
ON public.max_channels FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update max_channels in their organization"
ON public.max_channels FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete max_channels in their organization"
ON public.max_channels FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- RLS Policies for max_channel_state
CREATE POLICY "Users can view max_channel_state for their channels"
ON public.max_channel_state FOR SELECT
USING (
  channel_id IN (
    SELECT id FROM max_channels WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage max_channel_state for their channels"
ON public.max_channel_state FOR ALL
USING (
  channel_id IN (
    SELECT id FROM max_channels WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- RLS Policies for routing_rules
CREATE POLICY "Users can view routing_rules in their organization"
ON public.routing_rules FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert routing_rules in their organization"
ON public.routing_rules FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update routing_rules in their organization"
ON public.routing_rules FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete routing_rules in their organization"
ON public.routing_rules FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_max_channels_updated_at
BEFORE UPDATE ON max_channels
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_max_channel_state_updated_at
BEFORE UPDATE ON max_channel_state
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routing_rules_updated_at
BEFORE UPDATE ON routing_rules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to reset daily message counter
CREATE OR REPLACE FUNCTION reset_max_channel_daily_messages()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.messages_today_reset_at < CURRENT_DATE THEN
    NEW.messages_today := 0;
    NEW.messages_today_reset_at := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reset_max_channel_messages_trigger
BEFORE UPDATE ON max_channels
FOR EACH ROW
EXECUTE FUNCTION reset_max_channel_daily_messages();