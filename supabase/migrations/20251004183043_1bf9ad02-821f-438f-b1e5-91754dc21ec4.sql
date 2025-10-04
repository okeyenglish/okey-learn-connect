-- Создаем таблицу для истории изменений индивидуальных занятий
CREATE TABLE IF NOT EXISTS public.individual_lesson_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.individual_lessons(id) ON DELETE CASCADE,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  changed_by UUID REFERENCES auth.users(id),
  change_type TEXT NOT NULL, -- 'schedule_update', 'teacher_change', 'location_change', etc.
  changes JSONB NOT NULL, -- Структура: {"field": "teacher_name", "old_value": "...", "new_value": "..."}
  applied_from_date DATE, -- С какой даты применялось изменение
  applied_to_date DATE, -- До какой даты применялось изменение
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX idx_individual_lesson_history_lesson_id ON public.individual_lesson_history(lesson_id);
CREATE INDEX idx_individual_lesson_history_changed_at ON public.individual_lesson_history(changed_at DESC);

-- RLS политики
ALTER TABLE public.individual_lesson_history ENABLE ROW LEVEL SECURITY;

-- Администраторы могут видеть всю историю
CREATE POLICY "Admins can view all lesson history"
  ON public.individual_lesson_history
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Пользователи могут видеть историю занятий из своих филиалов
CREATE POLICY "Users can view lesson history from their branches"
  ON public.individual_lesson_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.individual_lessons il
      WHERE il.id = individual_lesson_history.lesson_id
        AND il.branch = ANY(get_user_branches(auth.uid()))
    )
  );

-- Авторизованные пользователи могут создавать записи истории
CREATE POLICY "Authenticated users can create lesson history"
  ON public.individual_lesson_history
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

COMMENT ON TABLE public.individual_lesson_history IS 'История изменений параметров индивидуальных занятий (преподаватель, аудитория, время и т.д.)';
COMMENT ON COLUMN public.individual_lesson_history.changes IS 'JSON объект с информацией об изменениях: {"field": "teacher_name", "old_value": "Иванов И.", "new_value": "Петров П."}';