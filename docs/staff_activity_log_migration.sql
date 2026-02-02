-- ============================================
-- SQL Migration: staff_activity_log для self-hosted Supabase
-- Применить вручную на api.academyos.ru
-- ============================================

-- =================================================================
-- Таблица логов активности сотрудников
-- =================================================================

CREATE TABLE IF NOT EXISTS public.staff_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Кто выполнил действие
  user_id UUID NOT NULL,
  user_name TEXT, -- Кэшируем имя для быстрого отображения
  user_branch TEXT,
  
  -- Что сделал
  action_type TEXT NOT NULL, -- 'message_sent', 'call_made', 'task_created', etc.
  action_label TEXT NOT NULL, -- Человекочитаемое описание
  
  -- Контекст действия
  target_type TEXT, -- 'client', 'student', 'task', 'invoice'
  target_id UUID,
  target_name TEXT, -- Имя клиента/студента для быстрого отображения
  
  -- Детали (metadata)
  details JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Комментарий к таблице
COMMENT ON TABLE public.staff_activity_log IS 'Лог активности сотрудников для мониторинга руководителями';

-- =================================================================
-- Индексы для производительности
-- =================================================================

CREATE INDEX IF NOT EXISTS idx_staff_activity_org_time ON public.staff_activity_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_activity_user ON public.staff_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_activity_branch ON public.staff_activity_log(user_branch, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_activity_type ON public.staff_activity_log(action_type);

-- =================================================================
-- RLS политики
-- =================================================================

ALTER TABLE public.staff_activity_log ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "staff_activity_admin_select" ON public.staff_activity_log;
DROP POLICY IF EXISTS "staff_activity_branch_manager_select" ON public.staff_activity_log;
DROP POLICY IF EXISTS "staff_activity_service_role" ON public.staff_activity_log;

-- Админы видят всё в организации
CREATE POLICY "staff_activity_admin_select" ON public.staff_activity_log
FOR SELECT USING (
  organization_id = public.get_user_organization_id() 
  AND public.is_admin()
);

-- Управляющие филиалов видят по своим филиалам
CREATE POLICY "staff_activity_branch_manager_select" ON public.staff_activity_log
FOR SELECT USING (
  organization_id = public.get_user_organization_id()
  AND public.has_role(auth.uid(), 'branch_manager')
);

-- Service role имеет полный доступ (для триггеров)
CREATE POLICY "staff_activity_service_role" ON public.staff_activity_log
FOR ALL USING (true) WITH CHECK (true);

-- =================================================================
-- Триггер для логирования отправки сообщений
-- =================================================================

CREATE OR REPLACE FUNCTION public.log_message_sent_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
  v_user_branch TEXT;
  v_client_name TEXT;
BEGIN
  -- Логируем только исходящие сообщения от сотрудников
  -- self-hosted использует is_outgoing вместо direction
  IF (NEW.is_outgoing = true OR NEW.direction = 'outgoing') AND NEW.sender_id IS NOT NULL THEN
    -- Получаем данные сотрудника
    SELECT 
      COALESCE(first_name || ' ' || COALESCE(last_name, ''), email, 'Сотрудник'),
      branch
    INTO v_user_name, v_user_branch
    FROM public.profiles
    WHERE id = NEW.sender_id;
    
    -- Получаем имя клиента
    SELECT COALESCE(name, first_name || ' ' || COALESCE(last_name, ''), phone, 'Клиент')
    INTO v_client_name
    FROM public.clients
    WHERE id = NEW.client_id;
    
    -- Записываем в лог
    INSERT INTO public.staff_activity_log (
      organization_id, user_id, user_name, user_branch, 
      action_type, action_label,
      target_type, target_id, target_name
    )
    VALUES (
      NEW.organization_id,
      NEW.sender_id,
      v_user_name,
      v_user_branch,
      'message_sent',
      'Отправил сообщение',
      'client',
      NEW.client_id,
      v_client_name
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Триггер на chat_messages
DROP TRIGGER IF EXISTS trg_log_message_sent ON public.chat_messages;
CREATE TRIGGER trg_log_message_sent
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.log_message_sent_activity();

-- =================================================================
-- Триггер для логирования изменения статуса клиента/лида
-- =================================================================

CREATE OR REPLACE FUNCTION public.log_client_status_change_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_user_name TEXT;
  v_user_branch TEXT;
  v_client_name TEXT;
BEGIN
  -- Логируем только если статус изменился
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Получаем текущего пользователя
    v_user_id := auth.uid();
    
    IF v_user_id IS NOT NULL THEN
      -- Получаем данные сотрудника
      SELECT 
        COALESCE(first_name || ' ' || COALESCE(last_name, ''), email, 'Сотрудник'),
        branch
      INTO v_user_name, v_user_branch
      FROM public.profiles
      WHERE id = v_user_id;
      
      -- Имя клиента
      v_client_name := COALESCE(NEW.name, NEW.first_name || ' ' || COALESCE(NEW.last_name, ''), NEW.phone, 'Клиент');
      
      -- Записываем в лог
      INSERT INTO public.staff_activity_log (
        organization_id, user_id, user_name, user_branch, 
        action_type, action_label,
        target_type, target_id, target_name,
        details
      )
      VALUES (
        NEW.organization_id,
        v_user_id,
        v_user_name,
        v_user_branch,
        'lead_status_changed',
        'Изменил статус',
        'client',
        NEW.id,
        v_client_name,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Триггер на clients
DROP TRIGGER IF EXISTS trg_log_client_status_change ON public.clients;
CREATE TRIGGER trg_log_client_status_change
AFTER UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.log_client_status_change_activity();

-- =================================================================
-- Триггер для логирования создания/выполнения задач
-- =================================================================

CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_user_name TEXT;
  v_user_branch TEXT;
  v_action_type TEXT;
  v_action_label TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Получаем данные сотрудника
  SELECT 
    COALESCE(first_name || ' ' || COALESCE(last_name, ''), email, 'Сотрудник'),
    branch
  INTO v_user_name, v_user_branch
  FROM public.profiles
  WHERE id = v_user_id;
  
  -- Определяем тип действия
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'task_created';
    v_action_label := 'Создал задачу';
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
    v_action_type := 'task_completed';
    v_action_label := 'Выполнил задачу';
  ELSE
    RETURN NEW;
  END IF;
  
  -- Записываем в лог
  INSERT INTO public.staff_activity_log (
    organization_id, user_id, user_name, user_branch, 
    action_type, action_label,
    target_type, target_id, target_name,
    details
  )
  VALUES (
    NEW.organization_id,
    v_user_id,
    v_user_name,
    v_user_branch,
    v_action_type,
    v_action_label,
    'task',
    NEW.id,
    COALESCE(NEW.title, NEW.description, 'Задача'),
    jsonb_build_object('task_type', NEW.task_type, 'priority', NEW.priority)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Триггер на tasks (если таблица существует)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    DROP TRIGGER IF EXISTS trg_log_task_activity ON public.tasks;
    CREATE TRIGGER trg_log_task_activity
    AFTER INSERT OR UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.log_task_activity();
  END IF;
END $$;

-- =================================================================
-- Функция для ручного логирования (для edge functions)
-- =================================================================

CREATE OR REPLACE FUNCTION public.log_staff_activity(
  p_organization_id UUID,
  p_user_id UUID,
  p_action_type TEXT,
  p_action_label TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_target_name TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_user_name TEXT;
  v_user_branch TEXT;
  v_log_id UUID;
BEGIN
  -- Получаем данные сотрудника
  SELECT 
    COALESCE(first_name || ' ' || COALESCE(last_name, ''), email, 'Сотрудник'),
    branch
  INTO v_user_name, v_user_branch
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Записываем в лог
  INSERT INTO public.staff_activity_log (
    organization_id, user_id, user_name, user_branch, 
    action_type, action_label,
    target_type, target_id, target_name,
    details
  )
  VALUES (
    p_organization_id,
    p_user_id,
    v_user_name,
    v_user_branch,
    p_action_type,
    p_action_label,
    p_target_type,
    p_target_id,
    p_target_name,
    p_details
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =================================================================
-- Enable realtime для staff_activity_log
-- =================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_activity_log;

-- Обновляем кэш схемы PostgREST
NOTIFY pgrst, 'reload schema';
