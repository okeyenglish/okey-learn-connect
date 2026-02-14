-- =====================================================
-- ONE-TIME CLEANUP: Удаление старых логов
-- Run on: api.academyos.ru
-- 
-- ВАЖНО: Выполнять в нерабочее время!
-- VACUUM FULL блокирует таблицы на время выполнения.
-- =====================================================

-- 1. Удаление старых webhook_logs (>30 дней)
DELETE FROM public.webhook_logs
WHERE created_at < NOW() - INTERVAL '30 days';

-- 2. Удаление старых event_bus (>30 дней)
DELETE FROM public.event_bus
WHERE created_at < NOW() - INTERVAL '30 days';

-- 3. Удаление старых cron.job_run_details (>7 дней)
DELETE FROM cron.job_run_details
WHERE end_time < NOW() - INTERVAL '7 days';

-- 4. Создание RPC-функции для автоматической очистки cron логов
-- (используется edge function db-maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_cron_job_run_details(days_to_keep INT DEFAULT 7)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM cron.job_run_details
  WHERE end_time < NOW() - (days_to_keep || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 5. VACUUM FULL для возврата дискового пространства ОС
-- (выполнять ПОСЛЕ DELETE, каждая команда отдельно)
VACUUM FULL public.webhook_logs;
VACUUM FULL public.event_bus;
VACUUM FULL cron.job_run_details;

-- 6. VACUUM ANALYZE для обновления статистики планировщика
VACUUM ANALYZE public.chat_messages;
VACUUM ANALYZE public.clients;
VACUUM ANALYZE public.students;

-- Проверка результатов
SELECT 
  schemaname,
  relname AS tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || relname)) AS total_size,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE relname IN ('webhook_logs', 'event_bus', 'chat_messages', 'clients', 'students')
ORDER BY pg_total_relation_size(schemaname || '.' || relname) DESC;
