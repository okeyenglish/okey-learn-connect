-- Migration: Staff work sessions and daily stats tracking
-- Run this on self-hosted Supabase (api.academyos.ru)
-- Date: 2026-01-31
-- IDEMPOTENT: Safe to run multiple times
--
-- These tables enable:
-- 1. Real-time work session tracking with active/idle time
-- 2. Daily statistics aggregation for KPI and reports
-- 3. Efficiency scoring and analytics

-- ============================================================
-- 1. CREATE staff_work_sessions TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_start TIMESTAMPTZ,
  session_end TIMESTAMPTZ,
  total_online_seconds INT DEFAULT 0,
  active_seconds INT DEFAULT 0,
  idle_seconds INT DEFAULT 0,
  on_call_seconds INT DEFAULT 0,
  idle_events INT DEFAULT 0,
  max_idle_streak_seconds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Each user can only have one session per day
  UNIQUE(user_id, session_date)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_work_sessions_user_date ON public.staff_work_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_work_sessions_org_date ON public.staff_work_sessions(organization_id, session_date);
CREATE INDEX IF NOT EXISTS idx_work_sessions_updated_at ON public.staff_work_sessions(updated_at);

-- Enable RLS
ALTER TABLE public.staff_work_sessions ENABLE ROW LEVEL SECURITY;

-- Policies (drop if exists, then create)
DROP POLICY IF EXISTS "staff_work_sessions_select_own" ON public.staff_work_sessions;
CREATE POLICY "staff_work_sessions_select_own" ON public.staff_work_sessions
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "staff_work_sessions_insert_own" ON public.staff_work_sessions;
CREATE POLICY "staff_work_sessions_insert_own" ON public.staff_work_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "staff_work_sessions_update_own" ON public.staff_work_sessions;
CREATE POLICY "staff_work_sessions_update_own" ON public.staff_work_sessions
  FOR UPDATE TO authenticated 
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "service_role_full_access_work_sessions" ON public.staff_work_sessions;
CREATE POLICY "service_role_full_access_work_sessions" ON public.staff_work_sessions
  FOR ALL USING (true);

-- Grant access
GRANT SELECT, INSERT, UPDATE ON public.staff_work_sessions TO authenticated;

-- ============================================================
-- 2. CREATE staff_daily_stats TABLE (aggregated statistics)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  total_online_minutes INT DEFAULT 0,
  active_minutes INT DEFAULT 0,
  idle_minutes INT DEFAULT 0,
  call_minutes INT DEFAULT 0,
  calls_count INT DEFAULT 0,
  messages_sent INT DEFAULT 0,
  chats_handled INT DEFAULT 0,
  avg_response_time_seconds INT,
  efficiency_score NUMERIC(5,2), -- 0-100 score
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Each user can only have one stats record per day
  UNIQUE(user_id, stat_date)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON public.staff_daily_stats(user_id, stat_date);
CREATE INDEX IF NOT EXISTS idx_daily_stats_org_date ON public.staff_daily_stats(organization_id, stat_date);
CREATE INDEX IF NOT EXISTS idx_daily_stats_efficiency ON public.staff_daily_stats(efficiency_score);

-- Enable RLS
ALTER TABLE public.staff_daily_stats ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "staff_daily_stats_select_own" ON public.staff_daily_stats;
CREATE POLICY "staff_daily_stats_select_own" ON public.staff_daily_stats
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "staff_daily_stats_insert_own" ON public.staff_daily_stats;
CREATE POLICY "staff_daily_stats_insert_own" ON public.staff_daily_stats
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "staff_daily_stats_update_own" ON public.staff_daily_stats;
CREATE POLICY "staff_daily_stats_update_own" ON public.staff_daily_stats
  FOR UPDATE TO authenticated 
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "service_role_full_access_daily_stats" ON public.staff_daily_stats;
CREATE POLICY "service_role_full_access_daily_stats" ON public.staff_daily_stats
  FOR ALL USING (true);

-- Grant access
GRANT SELECT, INSERT, UPDATE ON public.staff_daily_stats TO authenticated;

-- ============================================================
-- 3. CREATE trigger for updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_work_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_work_sessions_updated_at ON public.staff_work_sessions;
CREATE TRIGGER update_work_sessions_updated_at
  BEFORE UPDATE ON public.staff_work_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_work_session_updated_at();

-- ============================================================
-- 4. ENABLE REALTIME (optional, for live dashboards)
-- ============================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_work_sessions;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'staff_work_sessions already in publication';
END $$;

-- ============================================================
-- Verification query (run after migration)
-- ============================================================
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN ('staff_work_sessions', 'staff_daily_stats');
