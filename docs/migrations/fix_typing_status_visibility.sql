-- Migration: Fix typing_status visibility between users
-- Run this on self-hosted Supabase (api.academyos.ru)
-- Date: 2026-01-27
-- Issue: Different users can't see each other's typing status

-- ============================================================
-- STEP 1: Enable Realtime for typing_status table
-- ============================================================
-- This allows all connected clients to receive INSERT/UPDATE/DELETE events

ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_status;

-- ============================================================
-- STEP 2: Enable RLS (if not already enabled)
-- ============================================================
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 3: Drop existing restrictive policies (if any)
-- ============================================================
-- These policies may be too restrictive and only allow users to see their own data
DROP POLICY IF EXISTS "Users can manage own typing status" ON public.typing_status;
DROP POLICY IF EXISTS "typing_status_select_own" ON public.typing_status;
DROP POLICY IF EXISTS "typing_status_insert_own" ON public.typing_status;
DROP POLICY IF EXISTS "typing_status_update_own" ON public.typing_status;
DROP POLICY IF EXISTS "typing_status_delete_own" ON public.typing_status;
DROP POLICY IF EXISTS "typing_status_select_all" ON public.typing_status;

-- ============================================================
-- STEP 4: Create permissive policies for typing_status
-- ============================================================

-- All authenticated users can SELECT all typing statuses
-- This is essential for users to see when others are typing
CREATE POLICY "typing_status_select_all" ON public.typing_status
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can only INSERT their own typing status
CREATE POLICY "typing_status_insert_own" ON public.typing_status
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can only UPDATE their own typing status
CREATE POLICY "typing_status_update_own" ON public.typing_status
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only DELETE their own typing status
CREATE POLICY "typing_status_delete_own" ON public.typing_status
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- STEP 5: Grant access to authenticated role
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.typing_status TO authenticated;

-- ============================================================
-- STEP 6: Verify configuration
-- ============================================================

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'typing_status';

-- Check if table is in realtime publication
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'typing_status';

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'typing_status'
ORDER BY ordinal_position;
