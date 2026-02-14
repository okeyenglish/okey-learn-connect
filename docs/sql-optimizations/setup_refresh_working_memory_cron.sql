-- =====================================================
-- SETUP: pg_cron задача для refresh-working-memory
-- Run on: api.academyos.ru
-- 
-- Обновляет memory tiers и применяет freshness decay
-- каждую ночь в 2:30
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Удалить старую задачу если существует
DO $$
BEGIN
  PERFORM cron.unschedule('refresh-working-memory-nightly');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Job not found, creating new';
END;
$$;

-- Создать ежедневную задачу в 2:30 ночи
SELECT cron.schedule(
  'refresh-working-memory-nightly',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://api.academyos.ru/functions/v1/refresh-working-memory',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ВСТАВЬТЕ_ANON_KEY"}'::jsonb,
    body := '{"source": "pg_cron"}'::jsonb
  ) AS request_id;
  $$
);

-- Проверка
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname = 'refresh-working-memory-nightly';
