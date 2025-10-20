-- Таблица для замен преподавателей
CREATE TABLE IF NOT EXISTS public.teacher_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_session_id UUID,
  individual_lesson_session_id UUID,
  original_teacher_id UUID NOT NULL,
  substitute_teacher_id UUID NOT NULL,
  substitution_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  CONSTRAINT teacher_substitutions_lesson_check CHECK (
    (lesson_session_id IS NOT NULL AND individual_lesson_session_id IS NULL) OR
    (lesson_session_id IS NULL AND individual_lesson_session_id IS NOT NULL)
  )
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_teacher_substitutions_original ON public.teacher_substitutions(original_teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_substitutions_substitute ON public.teacher_substitutions(substitute_teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_substitutions_date ON public.teacher_substitutions(substitution_date);
CREATE INDEX IF NOT EXISTS idx_teacher_substitutions_status ON public.teacher_substitutions(status);

-- RLS политики
ALTER TABLE public.teacher_substitutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view substitutions"
  ON public.teacher_substitutions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage substitutions"
  ON public.teacher_substitutions
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'branch_manager') OR
    has_role(auth.uid(), 'methodist')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'branch_manager') OR
    has_role(auth.uid(), 'methodist')
  );

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION public.update_teacher_substitutions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_teacher_substitutions_updated_at
  BEFORE UPDATE ON public.teacher_substitutions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_teacher_substitutions_updated_at();

-- Функция для поиска доступных преподавателей на замену
CREATE OR REPLACE FUNCTION public.find_available_teachers(
  p_date DATE,
  p_time TEXT,
  p_subject TEXT,
  p_branch TEXT
)
RETURNS TABLE (
  teacher_id UUID,
  first_name TEXT,
  last_name TEXT,
  has_conflict BOOLEAN,
  conflict_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    EXISTS (
      SELECT 1 FROM learning_groups lg
      INNER JOIN lesson_sessions ls ON lg.id = ls.group_id
      WHERE lg.teacher_id = p.id
        AND ls.lesson_date = p_date
        AND lg.schedule_time = p_time
        AND ls.status != 'cancelled'
      UNION ALL
      SELECT 1 FROM individual_lessons il
      INNER JOIN individual_lesson_sessions ils ON il.id = ils.individual_lesson_id
      WHERE il.teacher_id = p.id
        AND ils.lesson_date = p_date
        AND il.schedule_time = p_time
        AND ils.status != 'cancelled'
    ) as has_conflict,
    (
      SELECT COUNT(*) FROM learning_groups lg
      INNER JOIN lesson_sessions ls ON lg.id = ls.group_id
      WHERE lg.teacher_id = p.id
        AND ls.lesson_date = p_date
        AND ls.status != 'cancelled'
      UNION ALL
      SELECT COUNT(*) FROM individual_lessons il
      INNER JOIN individual_lesson_sessions ils ON il.id = ils.individual_lesson_id
      WHERE il.teacher_id = p.id
        AND ils.lesson_date = p_date
        AND ils.status != 'cancelled'
    )::INTEGER as conflict_count
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'teacher'
    AND (p.branch = p_branch OR p.branch IS NULL)
  ORDER BY has_conflict, conflict_count, p.first_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;