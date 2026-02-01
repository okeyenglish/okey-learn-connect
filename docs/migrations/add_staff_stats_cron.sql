-- Migration: Cron job for aggregate-staff-stats
-- Run this on self-hosted Supabase (api.academyos.ru)
-- Date: 2026-02-01
-- IDEMPOTENT: Safe to run multiple times

-- Ensure pg_cron and pg_net extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage on cron schema to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Unschedule existing jobs if they exist (safe cleanup)
SELECT cron.unschedule('aggregate-staff-stats-hourly') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'aggregate-staff-stats-hourly');

SELECT cron.unschedule('aggregate-staff-stats-daily-final')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'aggregate-staff-stats-daily-final');

-- Schedule hourly aggregation at :05 minutes
SELECT cron.schedule(
  'aggregate-staff-stats-hourly',
  '5 * * * *',
  E'SELECT net.http_post(url := \'https://api.academyos.ru/functions/v1/aggregate-staff-stats\', headers := \'{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY5MDg4ODgzLCJleHAiOjE5MjY3Njg4ODN9.WEsCyaCdQvxzVObedC-A9hWTJUSwI_p9nCG1wlbaNEg"}\'::jsonb, body := \'{"source": "cron"}\'::jsonb);'
);

-- Schedule final daily aggregation at 23:55
SELECT cron.schedule(
  'aggregate-staff-stats-daily-final',
  '55 23 * * *',
  E'SELECT net.http_post(url := \'https://api.academyos.ru/functions/v1/aggregate-staff-stats\', headers := \'{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY5MDg4ODgzLCJleHAiOjE5MjY3Njg4ODN9.WEsCyaCdQvxzVObedC-A9hWTJUSwI_p9nCG1wlbaNEg"}\'::jsonb, body := \'{"source": "cron-daily"}\'::jsonb);'
);

-- Verification
SELECT jobid, jobname, schedule, command FROM cron.job 
WHERE jobname LIKE 'aggregate-staff-stats%';
