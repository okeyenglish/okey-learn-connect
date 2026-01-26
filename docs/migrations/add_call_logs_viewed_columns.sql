-- Миграция: Добавление колонок для отслеживания просмотренных звонков
-- Выполните этот скрипт на self-hosted Supabase (api.academyos.ru)

-- Добавляем колонку is_viewed для отметки просмотренного звонка
ALTER TABLE call_logs 
ADD COLUMN IF NOT EXISTS is_viewed boolean DEFAULT false;

-- Добавляем колонку viewed_at для времени просмотра
ALTER TABLE call_logs 
ADD COLUMN IF NOT EXISTS viewed_at timestamp with time zone;

-- Добавляем колонку viewed_by для ID пользователя, который просмотрел
ALTER TABLE call_logs 
ADD COLUMN IF NOT EXISTS viewed_by uuid;

-- Создаём индекс для быстрого поиска непросмотренных пропущенных звонков
CREATE INDEX IF NOT EXISTS idx_call_logs_unviewed_missed 
ON call_logs (client_id, status, is_viewed) 
WHERE status = 'missed' AND (is_viewed IS NULL OR is_viewed = false);

-- Включаем realtime для таблицы call_logs
ALTER PUBLICATION supabase_realtime ADD TABLE call_logs;

-- Комментарии для документации
COMMENT ON COLUMN call_logs.is_viewed IS 'Флаг: звонок был просмотрен менеджером';
COMMENT ON COLUMN call_logs.viewed_at IS 'Время просмотра звонка';
COMMENT ON COLUMN call_logs.viewed_by IS 'ID пользователя, который просмотрел звонок';
