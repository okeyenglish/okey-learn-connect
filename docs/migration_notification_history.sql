-- ============================================================
-- Миграция: История уведомлений с статусами доставки
-- Для self-hosted Supabase (api.academyos.ru)
-- 
-- ИНСТРУКЦИЯ: Выполните этот SQL вручную на self-hosted сервере
-- ============================================================

-- Таблица истории отправленных уведомлений
CREATE TABLE IF NOT EXISTS public.notification_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Получатель
  recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('teacher', 'parent', 'student', 'client', 'staff')),
  recipient_id UUID NULL, -- ID преподавателя, студента и т.д.
  recipient_name VARCHAR(255) NOT NULL,
  recipient_contact VARCHAR(255) NULL, -- телефон или email
  
  -- Канал уведомления
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp', 'telegram', 'max', 'chatos', 'email', 'push', 'sms')),
  
  -- Тип уведомления
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
    'lesson_reminder',      -- Напоминание о занятии
    'schedule_change',      -- Изменение расписания
    'payment_reminder',     -- Напоминание об оплате
    'homework',             -- Домашнее задание
    'attendance',           -- Отсутствие/присутствие
    'custom',               -- Произвольное
    'system'                -- Системное
  )),
  
  -- Контекст (связь с занятием, группой и т.д.)
  lesson_session_id UUID NULL,
  group_id UUID NULL,
  student_id UUID NULL,
  
  -- Содержимое
  title VARCHAR(255) NOT NULL,
  message_text TEXT NOT NULL,
  
  -- Статус доставки
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'cancelled')),
  status_details TEXT NULL, -- Детали ошибки или дополнительная информация
  
  -- Внешние идентификаторы
  external_message_id VARCHAR(255) NULL, -- ID сообщения в мессенджере
  
  -- Временные метки
  scheduled_at TIMESTAMPTZ NULL, -- Когда запланирована отправка
  sent_at TIMESTAMPTZ NULL, -- Когда отправлено
  delivered_at TIMESTAMPTZ NULL, -- Когда доставлено
  read_at TIMESTAMPTZ NULL, -- Когда прочитано
  failed_at TIMESTAMPTZ NULL, -- Когда провалилось
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_notification_history_organization_id 
  ON public.notification_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_recipient_type_id 
  ON public.notification_history(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_notification_type 
  ON public.notification_history(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_history_status 
  ON public.notification_history(status);
CREATE INDEX IF NOT EXISTS idx_notification_history_created_at 
  ON public.notification_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_history_lesson_session_id 
  ON public.notification_history(lesson_session_id) WHERE lesson_session_id IS NOT NULL;

-- RLS
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

-- Политики
DROP POLICY IF EXISTS "Users can view notification history of their organization" ON public.notification_history;
CREATE POLICY "Users can view notification history of their organization"
  ON public.notification_history
  FOR SELECT
  USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert notification history for their organization" ON public.notification_history;
CREATE POLICY "Users can insert notification history for their organization"
  ON public.notification_history
  FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Users can update notification history of their organization" ON public.notification_history;
CREATE POLICY "Users can update notification history of their organization"
  ON public.notification_history
  FOR UPDATE
  USING (organization_id = public.get_user_organization_id());

-- Триггер обновления updated_at
DROP TRIGGER IF EXISTS update_notification_history_updated_at ON public.notification_history;
CREATE TRIGGER update_notification_history_updated_at
  BEFORE UPDATE ON public.notification_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Таблица настроек уведомлений родителей
-- ============================================================
CREATE TABLE IF NOT EXISTS public.parent_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  
  -- Каналы уведомлений
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
  telegram_enabled BOOLEAN NOT NULL DEFAULT false,
  max_enabled BOOLEAN NOT NULL DEFAULT false,
  chatos_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Предпочтительный канал
  preferred_channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp' 
    CHECK (preferred_channel IN ('whatsapp', 'telegram', 'max', 'chatos', 'email', 'push')),
  
  -- Типы уведомлений
  lesson_reminders BOOLEAN NOT NULL DEFAULT true,
  schedule_changes BOOLEAN NOT NULL DEFAULT true,
  payment_reminders BOOLEAN NOT NULL DEFAULT true,
  homework_notifications BOOLEAN NOT NULL DEFAULT true,
  attendance_notifications BOOLEAN NOT NULL DEFAULT true,
  
  -- Время напоминания (в минутах до начала занятия)
  reminder_minutes_before INTEGER NOT NULL DEFAULT 60 CHECK (reminder_minutes_before >= 5 AND reminder_minutes_before <= 1440),
  
  -- Контактные данные (если отличаются от основных)
  notification_phone VARCHAR(50) NULL,
  notification_email VARCHAR(255) NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (student_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_parent_notification_settings_organization_id 
  ON public.parent_notification_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_parent_notification_settings_student_id 
  ON public.parent_notification_settings(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_notification_settings_lesson_reminders 
  ON public.parent_notification_settings(lesson_reminders) WHERE lesson_reminders = true;

-- RLS
ALTER TABLE public.parent_notification_settings ENABLE ROW LEVEL SECURITY;

-- Политики
DROP POLICY IF EXISTS "Users can view parent settings of their organization" ON public.parent_notification_settings;
CREATE POLICY "Users can view parent settings of their organization"
  ON public.parent_notification_settings
  FOR SELECT
  USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Users can create parent settings for their organization" ON public.parent_notification_settings;
CREATE POLICY "Users can create parent settings for their organization"
  ON public.parent_notification_settings
  FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Users can update parent settings of their organization" ON public.parent_notification_settings;
CREATE POLICY "Users can update parent settings of their organization"
  ON public.parent_notification_settings
  FOR UPDATE
  USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete parent settings of their organization" ON public.parent_notification_settings;
CREATE POLICY "Users can delete parent settings of their organization"
  ON public.parent_notification_settings
  FOR DELETE
  USING (organization_id = public.get_user_organization_id());

-- Триггер обновления updated_at
DROP TRIGGER IF EXISTS update_parent_notification_settings_updated_at ON public.parent_notification_settings;
CREATE TRIGGER update_parent_notification_settings_updated_at
  BEFORE UPDATE ON public.parent_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Добавление колонки parent_reminder_sent в lesson_sessions
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_sessions' AND column_name = 'parent_reminder_sent') THEN
    ALTER TABLE public.lesson_sessions 
      ADD COLUMN parent_reminder_sent BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Комментарии
COMMENT ON TABLE public.notification_history IS 'История всех отправленных уведомлений с статусами доставки';
COMMENT ON TABLE public.parent_notification_settings IS 'Настройки уведомлений для родителей каждого ученика';
COMMENT ON COLUMN public.notification_history.status IS 'Статус: pending (ожидает), sent (отправлено), delivered (доставлено), read (прочитано), failed (ошибка), cancelled (отменено)';
