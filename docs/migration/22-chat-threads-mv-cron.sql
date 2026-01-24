-- ============================================================
-- pg_cron задача для backup-обновления chat_threads_mv
-- Минимальный интервал pg_cron = 1 минута
-- ============================================================

-- Убедимся что расширения включены
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Функция проверки и обновления MV (вызывается из pg_cron)
CREATE OR REPLACE FUNCTION public.cron_refresh_chat_threads_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_refresh TIMESTAMPTZ;
  seconds_since NUMERIC;
  max_stale_seconds NUMERIC := 60; -- Обновляем если данные старше 60 секунд
  start_time TIMESTAMPTZ := clock_timestamp();
  duration_ms NUMERIC;
BEGIN
  -- Получаем время последнего обновления
  SELECT last_refresh_at, 
         EXTRACT(EPOCH FROM (now() - last_refresh_at))
  INTO last_refresh, seconds_since
  FROM public.chat_threads_mv_refresh_log
  WHERE id = 1;
  
  -- Если данные устарели - обновляем
  IF last_refresh IS NULL OR seconds_since > max_stale_seconds THEN
    RAISE NOTICE '[cron_refresh] MV stale (% sec), refreshing...', ROUND(seconds_since, 1);
    
    -- Обновляем материализованное представление
    REFRESH MATERIALIZED VIEW CONCURRENTLY chat_threads_mv;
    
    duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;
    
    -- Обновляем лог
    UPDATE public.chat_threads_mv_refresh_log
    SET 
      last_refresh_at = now(),
      refresh_count = refresh_count + 1,
      last_triggered_by = 'pg_cron'
    WHERE id = 1;
    
    RAISE NOTICE '[cron_refresh] ✅ Completed in % ms', ROUND(duration_ms, 2);
  ELSE
    RAISE NOTICE '[cron_refresh] MV fresh (% sec ago), skipping', ROUND(seconds_since, 1);
  END IF;
END;
$$;

-- 2. Удаляем старую задачу если есть
DO $$
BEGIN
  PERFORM cron.unschedule('refresh-chat-threads-mv');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Job refresh-chat-threads-mv not found, creating new';
END;
$$;

-- 3. Создаем cron задачу (каждую минуту)
SELECT cron.schedule(
  'refresh-chat-threads-mv',
  '* * * * *', -- Каждую минуту
  $$SELECT public.cron_refresh_chat_threads_mv()$$
);

-- 4. Альтернативная задача через Edge Function (более надежно для self-hosted)
DO $$
BEGIN
  PERFORM cron.unschedule('refresh-chat-threads-mv-edge');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

SELECT cron.schedule(
  'refresh-chat-threads-mv-edge',
  '*/2 * * * *', -- Каждые 2 минуты как backup
  $$
  SELECT net.http_post(
    url := 'https://api.academyos.ru/functions/v1/refresh-chat-threads-mv',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"}'::jsonb,
    body := '{"source": "pg_cron_backup"}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================
-- Проверка созданных задач
-- ============================================================
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname LIKE '%chat-threads%'
ORDER BY jobname;

-- Посмотреть историю выполнения
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
