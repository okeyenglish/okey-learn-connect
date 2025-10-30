-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule SLA Monitor to run every 15 minutes
-- This will check for missed SLAs and send payment reminders
SELECT cron.schedule(
  'sla-monitor-job',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://kbojujfwtvmsgudumown.supabase.co/functions/v1/sla-monitor',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtib2p1amZ3dHZtc2d1ZHVtb3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5MzksImV4cCI6MjA3Mzc3MDkzOX0.4SZggdlllMM8SYUo9yZKR-fR-nK4fIL4ZMciQW2EaNY"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);

-- Schedule Event Processor to run every 5 minutes
-- This will process pending events from the event bus
SELECT cron.schedule(
  'process-events-job',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://kbojujfwtvmsgudumown.supabase.co/functions/v1/process-events',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtib2p1amZ3dHZtc2d1ZHVtb3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5MzksImV4cCI6MjA3Mzc3MDkzOX0.4SZggdlllMM8SYUo9yZKR-fR-nK4fIL4ZMciQW2EaNY"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);

-- Schedule Materialized Views refresh to run every hour
SELECT cron.schedule(
  'refresh-materialized-views-job',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT public.refresh_advanced_materialized_views();
  $$
);

-- Create a function to check cron job status
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE (
  jobid bigint,
  schedule text,
  command text,
  nodename text,
  nodeport integer,
  database text,
  username text,
  active boolean,
  jobname text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY SELECT * FROM cron.job;
END;
$$;

COMMENT ON FUNCTION public.get_cron_jobs() IS 'Returns list of all scheduled cron jobs';