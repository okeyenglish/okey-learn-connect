-- RPC функция для атомарной блокировки импорта
CREATE OR REPLACE FUNCTION try_acquire_import_lock()
RETURNS TABLE(acquired BOOLEAN, progress_id UUID, current_offset INT) AS $$
DECLARE
  progress_row RECORD;
  now_time TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Блокируем строку для обновления
  SELECT * INTO progress_row
  FROM salebot_import_progress
  FOR UPDATE SKIP LOCKED
  LIMIT 1;
  
  -- Если не смогли заблокировать (уже занята)
  IF progress_row.id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 0;
    RETURN;
  END IF;
  
  -- Проверяем таймаут (15 минут)
  IF progress_row.is_running AND 
     (EXTRACT(EPOCH FROM (now_time - progress_row.last_run_at)) / 60) > 15 THEN
    -- Сбрасываем зависший импорт
    UPDATE salebot_import_progress
    SET is_running = FALSE
    WHERE id = progress_row.id;
    progress_row.is_running := FALSE;
  END IF;
  
  -- Если уже запущен, возвращаем FALSE
  IF progress_row.is_running THEN
    RETURN QUERY SELECT FALSE, progress_row.id, progress_row.current_offset;
    RETURN;
  END IF;
  
  -- Устанавливаем флаг
  UPDATE salebot_import_progress
  SET 
    is_running = TRUE,
    last_run_at = now_time,
    start_time = COALESCE(start_time, now_time)
  WHERE id = progress_row.id;
  
  RETURN QUERY SELECT TRUE, progress_row.id, progress_row.current_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC функция для атомарного обновления счетчиков импорта
CREATE OR REPLACE FUNCTION increment_import_progress(
  p_progress_id UUID,
  p_clients_count INT,
  p_messages_count INT,
  p_imported_count INT,
  p_new_offset INT,
  p_errors TEXT[] DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE salebot_import_progress
  SET 
    total_clients_processed = total_clients_processed + p_clients_count,
    total_messages_imported = total_messages_imported + p_messages_count,
    total_imported = total_imported + p_imported_count,
    current_offset = p_new_offset,
    is_running = FALSE,
    errors = COALESCE(p_errors, errors),
    updated_at = NOW()
  WHERE id = p_progress_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;