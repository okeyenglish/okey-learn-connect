-- Включаем расширения для cron и http запросов
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Создаем таблицу для отслеживания прогресса импорта
CREATE TABLE IF NOT EXISTS salebot_import_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_offset integer NOT NULL DEFAULT 0,
  total_imported integer NOT NULL DEFAULT 0,
  total_clients_processed integer NOT NULL DEFAULT 0,
  is_running boolean NOT NULL DEFAULT false,
  last_run_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  errors jsonb DEFAULT '[]'::jsonb
);

-- RLS для таблицы прогресса
ALTER TABLE salebot_import_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view import progress"
ON salebot_import_progress FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can manage import progress"
ON salebot_import_progress FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Создаем единственную запись для отслеживания прогресса
INSERT INTO salebot_import_progress (current_offset, total_imported, total_clients_processed, is_running)
VALUES (0, 0, 0, false)
ON CONFLICT DO NOTHING;

-- Создаем cron задачу для автоматического импорта каждые 2 минуты
SELECT cron.schedule(
  'salebot-import-background',
  '*/2 * * * *', -- каждые 2 минуты
  $$
  SELECT
    net.http_post(
        url:='https://kbojujfwtvmsgudumown.supabase.co/functions/v1/import-salebot-chats-auto',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtib2p1amZ3dHZtc2d1ZHVtb3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5MzksImV4cCI6MjA3Mzc3MDkzOX0.4SZggdlllMM8SYUo9yZKR-fR-nK4fIL4ZMciQW2EaNY"}'::jsonb
    ) as request_id;
  $$
);

-- Комментарии
COMMENT ON TABLE salebot_import_progress IS 'Отслеживание прогресса фонового импорта из Salebot';
COMMENT ON COLUMN salebot_import_progress.current_offset IS 'Текущий offset для следующего батча';
COMMENT ON COLUMN salebot_import_progress.is_running IS 'Флаг, указывающий что импорт сейчас выполняется';