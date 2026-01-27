-- Migration: Add pg_cron job for automatic cleanup of stale presence records
-- Run this on self-hosted Supabase (api.academyos.ru)
-- Date: 2026-01-27
--
-- This cron job runs every 5 minutes to clean up:
-- 1. typing_status records older than 5 minutes
-- 2. chat_presence records older than 2 minutes (idle users)

-- ============================================================
-- 1. Ensure pg_cron extension is enabled
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================
-- 2. Create cleanup function
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  typing_deleted INTEGER;
  presence_deleted INTEGER;
BEGIN
  -- Clean up stale typing status (older than 5 minutes)
  DELETE FROM public.typing_status 
  WHERE updated_at < now() - interval '5 minutes';
  GET DIAGNOSTICS typing_deleted = ROW_COUNT;
  
  -- Clean up stale chat presence (older than 2 minutes)
  DELETE FROM public.chat_presence 
  WHERE updated_at < now() - interval '2 minutes';
  GET DIAGNOSTICS presence_deleted = ROW_COUNT;
  
  -- Log if any records were deleted (for debugging)
  IF typing_deleted > 0 OR presence_deleted > 0 THEN
    RAISE NOTICE 'Presence cleanup: typing_status=%, chat_presence=%', typing_deleted, presence_deleted;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_stale_presence() TO service_role;

-- ============================================================
-- 3. Schedule the cron job (every 5 minutes)
-- ============================================================
-- First, check if job exists and remove it
DO $$
DECLARE
  job_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'cleanup-stale-presence') INTO job_exists;
  IF job_exists THEN
    PERFORM cron.unschedule('cleanup-stale-presence');
    RAISE NOTICE 'Removed existing cron job';
  END IF;
END $$;

-- Schedule new job
SELECT cron.schedule(
  'cleanup-stale-presence',
  '*/5 * * * *',  -- Every 5 minutes
  $$SELECT public.cleanup_stale_presence()$$
);

-- ============================================================
-- Verify the job was created
-- ============================================================
-- SELECT * FROM cron.job WHERE jobname = 'cleanup-stale-presence';

-- ============================================================
-- Manual cleanup command (run if needed)
-- ============================================================
-- SELECT public.cleanup_stale_presence();
