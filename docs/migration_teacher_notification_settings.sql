-- ============================================================
-- Миграция: Настройки уведомлений преподавателей
-- Для self-hosted Supabase (api.academyos.ru)
-- 
-- ИНСТРУКЦИЯ: Выполните этот SQL вручную на self-hosted сервере
-- ============================================================

-- Таблица настроек уведомлений для каждого преподавателя
CREATE TABLE IF NOT EXISTS public.teacher_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Каналы уведомлений
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Типы уведомлений
  schedule_changes BOOLEAN NOT NULL DEFAULT true,
  lesson_reminders BOOLEAN NOT NULL DEFAULT true,
  
  -- Время напоминания (в минутах до начала занятия)
  reminder_minutes_before INTEGER NOT NULL DEFAULT 60 CHECK (reminder_minutes_before >= 5 AND reminder_minutes_before <= 1440),
  
  -- Контактные данные для уведомлений (если отличаются от основных)
  notification_phone VARCHAR(50) NULL,
  notification_email VARCHAR(255) NULL,
  
  -- Метаданные
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Уникальное ограничение на teacher_id
  UNIQUE (teacher_id)
);

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
COMMENT ON COLUMN public.teacher_notification_settings.email_enabled IS 'Включить уведомления через Email';
COMMENT ON COLUMN public.teacher_notification_settings.push_enabled IS 'Включить push-уведомления';
COMMENT ON COLUMN public.teacher_notification_settings.schedule_changes IS 'Уведомлять об изменениях в расписании';
COMMENT ON COLUMN public.teacher_notification_settings.lesson_reminders IS 'Уведомлять о предстоящих занятиях';
COMMENT ON COLUMN public.teacher_notification_settings.reminder_minutes_before IS 'За сколько минут до занятия отправлять напоминание';
