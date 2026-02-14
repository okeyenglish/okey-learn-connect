-- =====================================================
-- SETUP: pg_cron задача для автоматической ротации логов
-- Run on: api.academyos.ru
-- 
-- Вызывает edge function db-maintenance каждый день в 3:00
-- =====================================================

-- Убедитесь что расширения включены
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Удалить старую задачу если существует
SELECT cron.unschedule('db-maintenance-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'db-maintenance-daily');

-- Создать ежедневную задачу в 3:00 ночи
SELECT cron.schedule(
  'db-maintenance-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://api.academyos.ru/functions/v1/db-maintenance',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ВСТАВЬТЕ_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Проверка
SELECT * FROM cron.job WHERE jobname = 'db-maintenance-daily';
