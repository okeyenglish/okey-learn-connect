-- =============================================
-- Cron Setup: Mine Conversation Actions (Daily)
-- Run on self-hosted Supabase
-- =============================================

-- Unschedule old job if exists
DO $$
BEGIN
  PERFORM cron.unschedule('mine-conversation-actions-daily');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Job mine-conversation-actions-daily not found, skipping unschedule';
END;
$$;

-- Schedule daily at 4:00 AM (after segment-conversations at 3:00 AM)
SELECT cron.schedule(
  'mine-conversation-actions-daily',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://api.academyos.ru/functions/v1/mine-conversation-actions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY5MDg4ODgzLCJleHAiOjE5MjY3Njg4ODN9.WEsCyaCdQvxzVObedC-A9hWTJUSwI_p9nCG1wlbaNEg"}'::jsonb,
    body := '{"source": "pg_cron", "days_back": 7}'::jsonb
  ) AS request_id;
  $$
);

-- Verify
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'mine-conversation-actions-daily';
