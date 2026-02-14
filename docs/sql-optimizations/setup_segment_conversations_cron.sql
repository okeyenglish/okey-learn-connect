-- =====================================================
-- SETUP: pg_cron задача для segment-conversations
-- Run on: api.academyos.ru
-- 
-- Сегментирует новые диалоги каждый час (в :15 минут)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Удалить старую задачу если существует
DO $$
BEGIN
  PERFORM cron.unschedule('segment-conversations-hourly');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Job not found, creating new';
END;
$$;

-- Создать задачу каждый час в :15
SELECT cron.schedule(
  'segment-conversations-hourly',
  '15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://api.academyos.ru/functions/v1/segment-conversations',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ВСТАВЬТЕ_ANON_KEY"}'::jsonb,
    body := '{"source": "pg_cron", "mode": "recent"}'::jsonb
  ) AS request_id;
  $$
);

-- Проверка
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname = 'segment-conversations-hourly';
