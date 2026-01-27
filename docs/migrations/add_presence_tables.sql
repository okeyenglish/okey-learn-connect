-- Migration: Add typing_status and chat_presence tables for real-time presence indicators
-- Run this on self-hosted Supabase (api.academyos.ru)
-- Date: 2026-01-27
--
-- These tables enable:
-- 1. Typing indicators with draft preview in chat list
-- 2. "Who's viewing" eyes animation
-- 3. "On call" status indicator

-- ============================================================
-- 1. CREATE typing_status TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.typing_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  is_typing BOOLEAN NOT NULL DEFAULT false,
  draft_text TEXT,
  manager_name TEXT,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Each user can only have one typing status per client
  UNIQUE(user_id, client_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_typing_status_client_id ON public.typing_status(client_id);
CREATE INDEX IF NOT EXISTS idx_typing_status_is_typing ON public.typing_status(is_typing) WHERE is_typing = true;
CREATE INDEX IF NOT EXISTS idx_typing_status_updated_at ON public.typing_status(updated_at);

-- Enable RLS
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

-- Policies: All authenticated users can see typing status
CREATE POLICY "typing_status_select_all" ON public.typing_status
  FOR SELECT TO authenticated USING (true);

-- Users can only manage their own typing status
CREATE POLICY "typing_status_insert_own" ON public.typing_status
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "typing_status_update_own" ON public.typing_status
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "typing_status_delete_own" ON public.typing_status
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.typing_status TO authenticated;

-- ============================================================
-- 2. CREATE chat_presence TABLE
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

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_chat_presence_client_id ON public.chat_presence(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_presence_updated_at ON public.chat_presence(updated_at);

-- Enable RLS
ALTER TABLE public.chat_presence ENABLE ROW LEVEL SECURITY;

-- Policies: All authenticated users can see presence
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

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_presence TO authenticated;

-- ============================================================
-- 3. ENABLE REALTIME for both tables
-- ============================================================
-- Note: If publication already has the table, this will error - that's OK
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_status;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'typing_status already in publication';
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_presence;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'chat_presence already in publication';
END $$;

-- ============================================================
-- 4. AUTO-CLEANUP: Remove stale records
-- ============================================================
-- You can run this periodically via pg_cron:
-- SELECT cron.schedule('cleanup-presence', '*/5 * * * *', $$
--   DELETE FROM public.typing_status WHERE updated_at < now() - interval '5 minutes';
--   DELETE FROM public.chat_presence WHERE updated_at < now() - interval '2 minutes';
-- $$);

-- ============================================================
-- Verification query (run after migration)
-- ============================================================
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN ('typing_status', 'chat_presence');
