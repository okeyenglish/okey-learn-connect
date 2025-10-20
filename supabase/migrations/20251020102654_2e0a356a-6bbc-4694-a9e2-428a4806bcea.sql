-- ====================================
-- Этап 1: Расширение системы групп
-- ====================================

-- 1.1. Расширение таблицы learning_groups
ALTER TABLE learning_groups 
  ADD COLUMN IF NOT EXISTS is_auto_group BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_filter_conditions JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS responsible_manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custom_name_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS enrollment_url TEXT,
  ADD COLUMN IF NOT EXISTS color_code TEXT DEFAULT '#3B82F6';

COMMENT ON COLUMN learning_groups.is_auto_group IS 'Является ли группа автоматической (состав формируется по условиям)';
COMMENT ON COLUMN learning_groups.auto_filter_conditions IS 'Условия для автоматического формирования состава группы (JSON)';
COMMENT ON COLUMN learning_groups.responsible_manager_id IS 'Ответственный менеджер группы';
COMMENT ON COLUMN learning_groups.custom_name_locked IS 'Блокировка редактирования названия (для мини-групп)';
COMMENT ON COLUMN learning_groups.enrollment_url IS 'Ссылка для записи в группу';
COMMENT ON COLUMN learning_groups.color_code IS 'Цветовой код группы для визуализации';

CREATE INDEX IF NOT EXISTS idx_learning_groups_auto ON learning_groups(is_auto_group);
CREATE INDEX IF NOT EXISTS idx_learning_groups_manager ON learning_groups(responsible_manager_id);
CREATE INDEX IF NOT EXISTS idx_learning_groups_color ON learning_groups(color_code);

-- 1.2. Расширение таблицы group_students
ALTER TABLE group_students
  ADD COLUMN IF NOT EXISTS enrollment_type TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS enrollment_notes TEXT,
  ADD COLUMN IF NOT EXISTS exit_date DATE,
  ADD COLUMN IF NOT EXISTS exit_reason TEXT;

-- Добавляем проверку для enrollment_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'group_students_enrollment_type_check'
  ) THEN
    ALTER TABLE group_students 
    ADD CONSTRAINT group_students_enrollment_type_check 
    CHECK (enrollment_type IN ('manual', 'auto', 'transfer', 'lead_conversion'));
  END IF;
END $$;

COMMENT ON COLUMN group_students.enrollment_type IS 'Тип зачисления: manual, auto, transfer, lead_conversion';
COMMENT ON COLUMN group_students.enrollment_notes IS 'Заметки о зачислении';
COMMENT ON COLUMN group_students.exit_date IS 'Дата выхода из группы';
COMMENT ON COLUMN group_students.exit_reason IS 'Причина выхода из группы';

CREATE INDEX IF NOT EXISTS idx_group_students_enrollment_type ON group_students(enrollment_type);
CREATE INDEX IF NOT EXISTS idx_group_students_exit_date ON group_students(exit_date);

-- 1.3. Создание таблицы group_history для логирования изменений
CREATE TABLE IF NOT EXISTS group_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES learning_groups(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Добавляем проверку для event_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'group_history_event_type_check'
  ) THEN
    ALTER TABLE group_history 
    ADD CONSTRAINT group_history_event_type_check 
    CHECK (event_type IN (
      'created', 'updated', 'deleted', 
      'student_added', 'student_removed', 'student_status_changed',
      'status_changed', 'schedule_changed', 'teacher_changed',
      'manual_note', 'auto_sync'
    ));
  END IF;
END $$;

COMMENT ON TABLE group_history IS 'История изменений группы';
COMMENT ON COLUMN group_history.event_type IS 'Тип события: created, updated, deleted, student_added, student_removed, student_status_changed, status_changed, schedule_changed, teacher_changed, manual_note, auto_sync';
COMMENT ON COLUMN group_history.event_data IS 'Данные о событии в формате JSON';

CREATE INDEX IF NOT EXISTS idx_group_history_group ON group_history(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_history_type ON group_history(event_type);
CREATE INDEX IF NOT EXISTS idx_group_history_date ON group_history(created_at DESC);

-- 1.4. Создание таблицы group_permissions для управления правами
CREATE TABLE IF NOT EXISTS group_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES learning_groups(id) ON DELETE CASCADE,
  can_create_groups BOOLEAN DEFAULT false,
  can_edit_groups BOOLEAN DEFAULT false,
  can_delete_groups BOOLEAN DEFAULT false,
  can_add_students BOOLEAN DEFAULT false,
  can_remove_students BOOLEAN DEFAULT false,
  can_change_status BOOLEAN DEFAULT false,
  can_set_custom_name BOOLEAN DEFAULT false,
  can_view_finances BOOLEAN DEFAULT false,
  can_access_all_branches BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, group_id)
);

COMMENT ON TABLE group_permissions IS 'Права доступа к группам. group_id = NULL означает глобальные права';
COMMENT ON COLUMN group_permissions.group_id IS 'ID группы. NULL = глобальные права для пользователя';

CREATE INDEX IF NOT EXISTS idx_group_permissions_user ON group_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_group_permissions_group ON group_permissions(group_id);

-- 1.5. Расширение таблицы leads для связи с группами (предзапись)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS pre_enrolled_group_id UUID REFERENCES learning_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pre_enrollment_date DATE;

COMMENT ON COLUMN leads.pre_enrolled_group_id IS 'Группа для предварительной записи лида';
COMMENT ON COLUMN leads.pre_enrollment_date IS 'Дата предварительной записи';

CREATE INDEX IF NOT EXISTS idx_leads_group ON leads(pre_enrolled_group_id);

-- 1.6. Функция для логирования изменений групп
CREATE OR REPLACE FUNCTION log_group_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO group_history (group_id, event_type, event_data, changed_by)
    VALUES (NEW.id, 'created', to_jsonb(NEW), auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    -- Логируем только если есть изменения в ключевых полях
    IF (OLD.status != NEW.status) THEN
      INSERT INTO group_history (group_id, event_type, event_data, changed_by)
      VALUES (NEW.id, 'status_changed', 
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status),
        auth.uid());
    END IF;
    
    IF (OLD.responsible_teacher != NEW.responsible_teacher OR 
        (OLD.responsible_teacher IS NULL AND NEW.responsible_teacher IS NOT NULL) OR
        (OLD.responsible_teacher IS NOT NULL AND NEW.responsible_teacher IS NULL)) THEN
      INSERT INTO group_history (group_id, event_type, event_data, changed_by)
      VALUES (NEW.id, 'teacher_changed', 
        jsonb_build_object('old_teacher', OLD.responsible_teacher, 'new_teacher', NEW.responsible_teacher),
        auth.uid());
    END IF;
    
    IF (OLD.schedule_days IS DISTINCT FROM NEW.schedule_days OR 
        OLD.schedule_time IS DISTINCT FROM NEW.schedule_time) THEN
      INSERT INTO group_history (group_id, event_type, event_data, changed_by)
      VALUES (NEW.id, 'schedule_changed', 
        jsonb_build_object(
          'old_schedule_days', OLD.schedule_days, 
          'new_schedule_days', NEW.schedule_days,
          'old_schedule_time', OLD.schedule_time,
          'new_schedule_time', NEW.schedule_time
        ),
        auth.uid());
    END IF;
    
    -- Общее логирование обновления
    INSERT INTO group_history (group_id, event_type, event_data, changed_by)
    VALUES (NEW.id, 'updated', 
      jsonb_build_object('changes', jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))),
      auth.uid());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO group_history (group_id, event_type, event_data, changed_by)
    VALUES (OLD.id, 'deleted', to_jsonb(OLD), auth.uid());
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Создаем триггер для логирования
DROP TRIGGER IF EXISTS learning_groups_history_trigger ON learning_groups;
CREATE TRIGGER learning_groups_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON learning_groups
FOR EACH ROW EXECUTE FUNCTION log_group_changes();

-- 1.7. Функция для логирования изменений студентов в группах
CREATE OR REPLACE FUNCTION log_group_student_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO group_history (group_id, event_type, event_data, changed_by)
    VALUES (NEW.group_id, 'student_added', 
      jsonb_build_object(
        'student_id', NEW.student_id, 
        'enrollment_type', NEW.enrollment_type,
        'status', NEW.status
      ),
      auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.status != NEW.status) THEN
      INSERT INTO group_history (group_id, event_type, event_data, changed_by)
      VALUES (NEW.group_id, 'student_status_changed', 
        jsonb_build_object(
          'student_id', NEW.student_id,
          'old_status', OLD.status,
          'new_status', NEW.status
        ),
        auth.uid());
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO group_history (group_id, event_type, event_data, changed_by)
    VALUES (OLD.group_id, 'student_removed', 
      jsonb_build_object('student_id', OLD.student_id, 'status', OLD.status),
      auth.uid());
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Создаем триггер для логирования студентов
DROP TRIGGER IF EXISTS group_students_history_trigger ON group_students;
CREATE TRIGGER group_students_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON group_students
FOR EACH ROW EXECUTE FUNCTION log_group_student_changes();

-- 1.8. Функция для автоматической синхронизации студентов авто-группы
CREATE OR REPLACE FUNCTION sync_auto_group_students(p_group_id UUID)
RETURNS void AS $$
DECLARE
  v_group RECORD;
  v_student_rec RECORD;
  v_conditions JSONB;
BEGIN
  -- Получаем информацию о группе
  SELECT * INTO v_group 
  FROM learning_groups 
  WHERE id = p_group_id AND is_auto_group = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Группа не найдена или не является автоматической';
  END IF;
  
  v_conditions := v_group.auto_filter_conditions;
  
  -- Помечаем текущих студентов как dropped (но не удаляем)
  UPDATE group_students 
  SET status = 'dropped', 
      exit_date = CURRENT_DATE,
      exit_reason = 'Автоматическая синхронизация авто-группы',
      updated_at = now()
  WHERE group_id = p_group_id 
    AND status = 'active';
  
  -- Добавляем подходящих студентов
  FOR v_student_rec IN 
    SELECT s.id 
    FROM students s
    WHERE s.status = 'active'
      AND (v_conditions->>'branch' IS NULL OR s.branch = v_conditions->>'branch')
      AND (v_conditions->>'level' IS NULL OR s.level = v_conditions->>'level')
      AND (v_conditions->>'subject' IS NULL OR (v_conditions->>'subject')::text = s.preferred_subject)
      AND (v_conditions->>'age_min' IS NULL OR s.age >= (v_conditions->>'age_min')::integer)
      AND (v_conditions->>'age_max' IS NULL OR s.age <= (v_conditions->>'age_max')::integer)
  LOOP
    -- Вставляем или обновляем статус студента
    INSERT INTO group_students (group_id, student_id, status, enrollment_type, enrollment_date, enrollment_notes)
    VALUES (p_group_id, v_student_rec.id, 'active', 'auto', CURRENT_DATE, 'Автоматически добавлен по условиям авто-группы')
    ON CONFLICT (group_id, student_id) 
    DO UPDATE SET 
      status = 'active',
      enrollment_type = 'auto',
      exit_date = NULL,
      exit_reason = NULL,
      updated_at = now();
  END LOOP;
  
  -- Логируем синхронизацию
  INSERT INTO group_history (group_id, event_type, event_data, changed_by)
  VALUES (p_group_id, 'auto_sync', 
    jsonb_build_object('sync_date', CURRENT_DATE, 'conditions', v_conditions),
    NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION sync_auto_group_students IS 'Синхронизирует состав авто-группы согласно условиям фильтрации';

-- 1.9. Функция проверки прав доступа к группам
CREATE OR REPLACE FUNCTION check_group_permission(
  p_user_id UUID,
  p_group_id UUID,
  p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_perm BOOLEAN := false;
BEGIN
  -- Админы имеют все права
  IF has_role(p_user_id, 'admin') THEN
    RETURN true;
  END IF;
  
  -- Проверяем специфичные права (глобальные или для конкретной группы)
  SELECT 
    CASE p_permission
      WHEN 'create' THEN can_create_groups
      WHEN 'edit' THEN can_edit_groups
      WHEN 'delete' THEN can_delete_groups
      WHEN 'add_students' THEN can_add_students
      WHEN 'remove_students' THEN can_remove_students
      WHEN 'change_status' THEN can_change_status
      WHEN 'set_custom_name' THEN can_set_custom_name
      WHEN 'view_finances' THEN can_view_finances
      WHEN 'access_all_branches' THEN can_access_all_branches
      ELSE false
    END INTO v_has_perm
  FROM group_permissions
  WHERE user_id = p_user_id 
    AND (group_id IS NULL OR group_id = p_group_id)
  ORDER BY group_id NULLS LAST -- Приоритет специфичным правам группы
  LIMIT 1;
  
  RETURN COALESCE(v_has_perm, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION check_group_permission IS 'Проверяет наличие права доступа у пользователя к группе';

-- 1.10. RLS политики для новых таблиц

-- group_history: только чтение для авторизованных
ALTER TABLE group_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view group history" ON group_history;
CREATE POLICY "Authenticated users can view group history"
  ON group_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Only system can insert group history" ON group_history;
CREATE POLICY "Only system can insert group history"
  ON group_history FOR INSERT
  WITH CHECK (true); -- Вставки происходят через триггеры

-- group_permissions: управление для админов, просмотр своих прав для всех
ALTER TABLE group_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage group permissions" ON group_permissions;
CREATE POLICY "Admins can manage group permissions"
  ON group_permissions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view their own permissions" ON group_permissions;
CREATE POLICY "Users can view their own permissions"
  ON group_permissions FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- 1.11. Триггер для обновления updated_at в group_permissions
CREATE OR REPLACE FUNCTION update_group_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS group_permissions_updated_at ON group_permissions;
CREATE TRIGGER group_permissions_updated_at
BEFORE UPDATE ON group_permissions
FOR EACH ROW EXECUTE FUNCTION update_group_permissions_updated_at();