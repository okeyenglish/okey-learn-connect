-- ============================================================
-- Триггер для автоматического обновления chat_threads_mv
-- при новых сообщениях в chat_messages
-- ============================================================

-- 1. Таблица для отслеживания состояния обновления
CREATE TABLE IF NOT EXISTS public.chat_threads_mv_refresh_log (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_refresh_at TIMESTAMPTZ DEFAULT now(),
  refresh_count BIGINT DEFAULT 0,
  last_triggered_by TEXT,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Инициализация записи
INSERT INTO public.chat_threads_mv_refresh_log (id, last_refresh_at, refresh_count)
VALUES (1, now(), 0)
ON CONFLICT (id) DO NOTHING;

-- 2. Функция принудительного обновления MV (вызывается по cron или вручную)
CREATE OR REPLACE FUNCTION public.force_refresh_chat_threads_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_time TIMESTAMPTZ := clock_timestamp();
  duration_ms NUMERIC;
BEGIN
  -- Обновляем материализованное представление
  REFRESH MATERIALIZED VIEW CONCURRENTLY chat_threads_mv;
  
  duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;
  
  -- Обновляем лог
  UPDATE public.chat_threads_mv_refresh_log
  SET 
    last_refresh_at = now(),
    refresh_count = refresh_count + 1,
    last_triggered_by = 'force_refresh'
  WHERE id = 1;
  
  RAISE NOTICE '[chat_threads_mv] Refreshed in % ms', ROUND(duration_ms, 2);
END;
$$;

-- 3. Функция-триггер с дебаунсингом (вызывает Edge Function через pg_net)
CREATE OR REPLACE FUNCTION public.refresh_chat_threads_mv_debounced()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_refresh TIMESTAMPTZ;
  min_interval INTERVAL := '30 seconds';
  edge_function_url TEXT;
  anon_key TEXT;
BEGIN
  -- Получаем время последнего обновления
  SELECT last_refresh_at INTO last_refresh
  FROM public.chat_threads_mv_refresh_log
  WHERE id = 1;
  
  -- Если прошло достаточно времени - вызываем Edge Function
  IF last_refresh IS NULL OR (now() - last_refresh) > min_interval THEN
    -- Обновляем лог сразу (предотвращает параллельные вызовы)
    UPDATE public.chat_threads_mv_refresh_log
    SET 
      last_refresh_at = now(),
      refresh_count = refresh_count + 1,
      last_triggered_by = TG_OP || ':' || COALESCE(NEW.client_id::text, OLD.client_id::text)
    WHERE id = 1;
    
    -- URL Edge Function (self-hosted)
    edge_function_url := 'https://api.academyos.ru/functions/v1/refresh-chat-threads-mv';
    
    -- Получаем ANON_KEY из vault или используем напрямую
    -- Для self-hosted используем фиксированный ключ
    SELECT decrypted_secret INTO anon_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_ANON_KEY'
    LIMIT 1;
    
    -- Fallback если vault недоступен
    IF anon_key IS NULL THEN
      anon_key := current_setting('app.settings.anon_key', true);
    END IF;
    
    -- Вызываем Edge Function асинхронно через pg_net
    IF anon_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || anon_key
        ),
        body := jsonb_build_object(
          'triggered_at', now(),
          'operation', TG_OP,
          'client_id', COALESCE(NEW.client_id, OLD.client_id)
        )
      );
      
      RAISE NOTICE '[chat_threads_mv] Edge Function called (last refresh: %)', last_refresh;
    ELSE
      -- Fallback: pg_notify для внешнего обработчика
      PERFORM pg_notify('refresh_chat_threads_mv', json_build_object(
        'triggered_at', now(),
        'operation', TG_OP,
        'client_id', COALESCE(NEW.client_id, OLD.client_id)
      )::text);
      
      RAISE NOTICE '[chat_threads_mv] pg_notify sent (no anon_key found)';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Триггер на chat_messages
DROP TRIGGER IF EXISTS trg_refresh_chat_threads_mv ON public.chat_messages;

CREATE TRIGGER trg_refresh_chat_threads_mv
AFTER INSERT OR UPDATE OF is_read ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.refresh_chat_threads_mv_debounced();

-- 5. Функция для получения статуса MV
CREATE OR REPLACE FUNCTION public.get_chat_threads_mv_status()
RETURNS TABLE(
  last_refresh_at TIMESTAMPTZ,
  refresh_count BIGINT,
  last_triggered_by TEXT,
  seconds_since_refresh NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    last_refresh_at,
    refresh_count,
    last_triggered_by,
    EXTRACT(EPOCH FROM (now() - last_refresh_at))::NUMERIC AS seconds_since_refresh
  FROM public.chat_threads_mv_refresh_log
  WHERE id = 1;
$$;

-- ============================================================
-- Проверка созданных объектов
-- ============================================================
SELECT 'Trigger created' AS status, tgname AS trigger_name
FROM pg_trigger
WHERE tgname = 'trg_refresh_chat_threads_mv';

SELECT 'Functions created' AS status, proname AS function_name
FROM pg_proc
WHERE proname IN ('force_refresh_chat_threads_mv', 'refresh_chat_threads_mv_debounced', 'get_chat_threads_mv_status');
