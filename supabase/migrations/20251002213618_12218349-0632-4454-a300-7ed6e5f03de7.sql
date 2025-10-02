-- Создаем таблицу для хранения статусов индивидуальных занятий
CREATE TABLE IF NOT EXISTS public.individual_lesson_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_lesson_id UUID NOT NULL REFERENCES public.individual_lessons(id) ON DELETE CASCADE,
  lesson_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(individual_lesson_id, lesson_date)
);

-- Включаем RLS
ALTER TABLE public.individual_lesson_sessions ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Authenticated users can view lesson sessions"
  ON public.individual_lesson_sessions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage lesson sessions from their branches"
  ON public.individual_lesson_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.individual_lessons il
      INNER JOIN public.profiles p ON (
        il.branch = p.branch 
        OR EXISTS (
          SELECT 1 FROM public.manager_branches mb 
          WHERE mb.manager_id = auth.uid() AND mb.branch = il.branch
        )
      )
      WHERE il.id = individual_lesson_sessions.individual_lesson_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all lesson sessions"
  ON public.individual_lesson_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Триггер для обновления updated_at
CREATE TRIGGER update_individual_lesson_sessions_updated_at
  BEFORE UPDATE ON public.individual_lesson_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_individual_lesson_sessions_lesson_id 
  ON public.individual_lesson_sessions(individual_lesson_id);
CREATE INDEX IF NOT EXISTS idx_individual_lesson_sessions_lesson_date 
  ON public.individual_lesson_sessions(lesson_date);