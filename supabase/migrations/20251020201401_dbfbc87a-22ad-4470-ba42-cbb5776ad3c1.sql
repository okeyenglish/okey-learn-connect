-- Включаем расширения для cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Настраиваем cron job для автоматического создания уведомлений о платежах
-- Запускается каждый день в 10:00 утра по UTC (13:00 по МСК)
SELECT cron.schedule(
  'daily-payment-notifications',
  '0 10 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://kbojujfwtvmsgudumown.supabase.co/functions/v1/auto-payment-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtib2p1amZ3dHZtc2d1ZHVtb3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5MzksImV4cCI6MjA3Mzc3MDkzOX0.4SZggdlllMM8SYUo9yZKR-fR-nK4fIL4ZMciQW2EaNY"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Также можно настроить еженедельную проверку в пятницу в 16:00 (19:00 МСК)
SELECT cron.schedule(
  'weekly-payment-reminder',
  '0 16 * * 5',
  $$
  SELECT
    net.http_post(
        url:='https://kbojujfwtvmsgudumown.supabase.co/functions/v1/auto-payment-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtib2p1amZ3dHZtc2d1ZHVtb3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5MzksImV4cCI6MjA3Mzc3MDkzOX0.4SZggdlllMM8SYUo9yZKR-fR-nK4fIL4ZMciQW2EaNY"}'::jsonb,
        body:='{"scheduled": true, "type": "weekly"}'::jsonb
    ) as request_id;
  $$
);

-- Создаем таблицу для логирования выполнения cron jobs
CREATE TABLE IF NOT EXISTS public.cron_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL, -- 'success', 'failed'
  response_data JSONB,
  error_message TEXT,
  execution_time_ms INTEGER
);

-- Включаем RLS для логов
ALTER TABLE public.cron_job_logs ENABLE ROW LEVEL SECURITY;

-- Политика: администраторы могут просматривать логи
CREATE POLICY "Admins can view cron logs"
ON public.cron_job_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Функция для удаления старых логов (старше 30 дней)
CREATE OR REPLACE FUNCTION cleanup_old_cron_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.cron_job_logs
  WHERE executed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cron job для очистки старых логов (каждое воскресенье в 03:00)
SELECT cron.schedule(
  'cleanup-old-logs',
  '0 3 * * 0',
  $$
  SELECT cleanup_old_cron_logs();
  $$
);

COMMENT ON TABLE public.cron_job_logs IS 'Логи выполнения cron jobs для мониторинга автоматизации';
COMMENT ON FUNCTION cleanup_old_cron_logs IS 'Автоматическая очистка логов старше 30 дней';