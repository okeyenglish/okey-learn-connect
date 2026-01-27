-- ============================================================
-- Миграция: Настройки уведомлений преподавателей (v2)
-- Для self-hosted Supabase (api.academyos.ru)
-- 
-- ИНСТРУКЦИЯ: Выполните этот SQL вручную на self-hosted сервере
-- ============================================================

-- Таблица настроек уведомлений для каждого преподавателя
CREATE TABLE IF NOT EXISTS public.teacher_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Каналы уведомлений (мессенджеры)
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  telegram_enabled BOOLEAN NOT NULL DEFAULT false,
  max_enabled BOOLEAN NOT NULL DEFAULT false,
  internal_chat_enabled BOOLEAN NOT NULL DEFAULT true,  -- Внутренний чат с организацией
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Предпочтительный канал для уведомлений (основной)
  preferred_channel VARCHAR(20) NOT NULL DEFAULT 'internal_chat' 
    CHECK (preferred_channel IN ('whatsapp', 'telegram', 'max', 'internal_chat', 'email', 'push')),
  
  -- Типы уведомлений
  schedule_changes BOOLEAN NOT NULL DEFAULT true,
  lesson_reminders BOOLEAN NOT NULL DEFAULT true,
  
  -- Время напоминания (в минутах до начала занятия)
  reminder_minutes_before INTEGER NOT NULL DEFAULT 60 CHECK (reminder_minutes_before >= 5 AND reminder_minutes_before <= 1440),
  
  -- Контактные данные для уведомлений (если отличаются от основных)
  notification_phone VARCHAR(50) NULL,
  notification_email VARCHAR(255) NULL,
  notification_telegram_id VARCHAR(100) NULL,
  
  -- Метаданные
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Уникальное ограничение на teacher_id
  UNIQUE (teacher_id)
);

-- Если таблица уже существует, добавляем новые колонки
DO $$
BEGIN
  -- Добавляем telegram_enabled
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teacher_notification_settings' AND column_name = 'telegram_enabled') THEN
    ALTER TABLE public.teacher_notification_settings 
      ADD COLUMN telegram_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
  
  -- Добавляем max_enabled
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teacher_notification_settings' AND column_name = 'max_enabled') THEN
    ALTER TABLE public.teacher_notification_settings 
      ADD COLUMN max_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
  
  -- Добавляем internal_chat_enabled
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teacher_notification_settings' AND column_name = 'internal_chat_enabled') THEN
    ALTER TABLE public.teacher_notification_settings 
      ADD COLUMN internal_chat_enabled BOOLEAN NOT NULL DEFAULT true;
  END IF;
  
  -- Добавляем preferred_channel
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teacher_notification_settings' AND column_name = 'preferred_channel') THEN
    ALTER TABLE public.teacher_notification_settings 
      ADD COLUMN preferred_channel VARCHAR(20) NOT NULL DEFAULT 'internal_chat';
  END IF;
  
  -- Добавляем notification_telegram_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teacher_notification_settings' AND column_name = 'notification_telegram_id') THEN
    ALTER TABLE public.teacher_notification_settings 
      ADD COLUMN notification_telegram_id VARCHAR(100) NULL;
  END IF;
END $$;

-- Индексы
CREATE INDEX IF NOT EXISTS idx_teacher_notification_settings_teacher_id 
  ON public.teacher_notification_settings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_notification_settings_organization_id 
  ON public.teacher_notification_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_teacher_notification_settings_lesson_reminders 
  ON public.teacher_notification_settings(lesson_reminders) WHERE lesson_reminders = true;

-- RLS
ALTER TABLE public.teacher_notification_settings ENABLE ROW LEVEL SECURITY;

-- Политики
DROP POLICY IF EXISTS "Users can view notification settings of their organization" ON public.teacher_notification_settings;
CREATE POLICY "Users can view notification settings of their organization"
  ON public.teacher_notification_settings
  FOR SELECT
  USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Users can create notification settings for their organization" ON public.teacher_notification_settings;
CREATE POLICY "Users can create notification settings for their organization"
  ON public.teacher_notification_settings
  FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Users can update notification settings of their organization" ON public.teacher_notification_settings;
CREATE POLICY "Users can update notification settings of their organization"
  ON public.teacher_notification_settings
  FOR UPDATE
  USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete notification settings of their organization" ON public.teacher_notification_settings;
CREATE POLICY "Users can delete notification settings of their organization"
  ON public.teacher_notification_settings
  FOR DELETE
  USING (organization_id = public.get_user_organization_id());

-- Триггер обновления updated_at
DROP TRIGGER IF EXISTS update_teacher_notification_settings_updated_at ON public.teacher_notification_settings;
CREATE TRIGGER update_teacher_notification_settings_updated_at
  BEFORE UPDATE ON public.teacher_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Комментарии
COMMENT ON TABLE public.teacher_notification_settings IS 'Настройки уведомлений для каждого преподавателя';
COMMENT ON COLUMN public.teacher_notification_settings.whatsapp_enabled IS 'Включить уведомления через WhatsApp';
COMMENT ON COLUMN public.teacher_notification_settings.telegram_enabled IS 'Включить уведомления через Telegram';
COMMENT ON COLUMN public.teacher_notification_settings.max_enabled IS 'Включить уведомления через MAX';
COMMENT ON COLUMN public.teacher_notification_settings.internal_chat_enabled IS 'Включить уведомления через внутренний чат с организацией';
COMMENT ON COLUMN public.teacher_notification_settings.preferred_channel IS 'Предпочтительный канал для уведомлений';
COMMENT ON COLUMN public.teacher_notification_settings.email_enabled IS 'Включить уведомления через Email';
COMMENT ON COLUMN public.teacher_notification_settings.push_enabled IS 'Включить push-уведомления';
COMMENT ON COLUMN public.teacher_notification_settings.schedule_changes IS 'Уведомлять об изменениях в расписании';
COMMENT ON COLUMN public.teacher_notification_settings.lesson_reminders IS 'Уведомлять о предстоящих занятиях';
COMMENT ON COLUMN public.teacher_notification_settings.reminder_minutes_before IS 'За сколько минут до занятия отправлять напоминание';