-- Migration: Cron job for aggregate-staff-stats
-- Run this on self-hosted Supabase (api.academyos.ru)
-- Date: 2026-02-01
-- IDEMPOTENT: Safe to run multiple times
--
-- This cron job aggregates staff work sessions into daily stats every hour

-- Ensure pg_cron and pg_net extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage on cron schema to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Safe scheduling: drop existing job if exists, then create new one
DO $$
DECLARE
  job_exists BOOLEAN;
BEGIN
  -- Check if job already exists
  SELECT EXISTS(
    SELECT 1 FROM cron.job WHERE jobname = 'aggregate-staff-stats-hourly'
  ) INTO job_exists;
  
  -- Unschedule if exists
  IF job_exists THEN
    PERFORM cron.unschedule('aggregate-staff-stats-hourly');
    RAISE NOTICE 'Unscheduled existing aggregate-staff-stats-hourly job';
  END IF;
  
  -- Schedule new job - runs every hour at minute 5
  PERFORM cron.schedule(
    'aggregate-staff-stats-hourly',
    '5 * * * *',  -- Every hour at :05
    $$
    SELECT net.http_post(
      url := 'https://api.academyos.ru/functions/v1/aggregate-staff-stats',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY5MDg4ODgzLCJleHAiOjE5MjY3Njg4ODN9.WEsCyaCdQvxzVObedC-A9hWTJUSwI_p9nCG1wlbaNEg'
      ),
      body := jsonb_build_object('source', 'cron', 'timestamp', now())
    );
    $$
  );
  
  RAISE NOTICE 'Scheduled aggregate-staff-stats-hourly cron job';
END $$;

-- Also create an end-of-day job that runs final aggregation at 23:55
DO $$
DECLARE
  job_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM cron.job WHERE jobname = 'aggregate-staff-stats-daily-final'
  ) INTO job_exists;
  
  IF job_exists THEN
    PERFORM cron.unschedule('aggregate-staff-stats-daily-final');
    RAISE NOTICE 'Unscheduled existing aggregate-staff-stats-daily-final job';
  END IF;
  
  -- Schedule final daily aggregation at 23:55
  PERFORM cron.schedule(
    'aggregate-staff-stats-daily-final',
    '55 23 * * *',  -- Every day at 23:55
    $$
    SELECT net.http_post(
      url := 'https://api.academyos.ru/functions/v1/aggregate-staff-stats',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY5MDg4ODgzLCJleHAiOjE5MjY3Njg4ODN9.WEsCyaCdQvxzVObedC-A9hWTJUSwI_p9nCG1wlbaNEg'
      ),
      body := jsonb_build_object('source', 'cron-daily-final', 'timestamp', now())
    );
    $$
  );
  
  RAISE NOTICE 'Scheduled aggregate-staff-stats-daily-final cron job';
END $$;

-- ============================================================
-- Verification query (run after migration)
-- ============================================================
-- SELECT jobid, jobname, schedule, command FROM cron.job 
-- WHERE jobname LIKE 'aggregate-staff-stats%';
