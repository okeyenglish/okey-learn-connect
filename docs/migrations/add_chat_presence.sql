-- Migration: Add chat presence tracking (who's viewing which chat)
-- Run this on self-hosted Supabase (api.academyos.ru)
-- Date: 2026-01-27

-- ============================================================
-- Create chat_presence table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  presence_type TEXT NOT NULL DEFAULT 'viewing', -- 'viewing', 'on_call'
  manager_name TEXT,
  manager_avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Each user can only have one presence per client
  UNIQUE(user_id, client_id)
);

-- Create index for fast lookups by client
CREATE INDEX IF NOT EXISTS idx_chat_presence_client_id ON public.chat_presence(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_presence_updated_at ON public.chat_presence(updated_at);

-- ============================================================
-- Enable RLS with permissive SELECT policy
-- ============================================================
ALTER TABLE public.chat_presence ENABLE ROW LEVEL SECURITY;

-- All authenticated users can see all presence records
CREATE POLICY "chat_presence_select_all" ON public.chat_presence
  FOR SELECT TO authenticated USING (true);

-- Users can only manage their own presence
CREATE POLICY "chat_presence_insert_own" ON public.chat_presence
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_presence_update_own" ON public.chat_presence
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_presence_delete_own" ON public.chat_presence
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Enable Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_presence;

-- ============================================================
-- Grant access
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_presence TO authenticated;

-- ============================================================
-- Auto-cleanup: Remove stale presence (older than 2 minutes)
-- Run this periodically via cron or Edge Function
-- ============================================================
-- DELETE FROM public.chat_presence WHERE updated_at < now() - interval '2 minutes';
