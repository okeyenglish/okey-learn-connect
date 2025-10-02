-- Удаляем старые политики для individual_lesson_sessions
DROP POLICY IF EXISTS "Users can manage lesson sessions from their branches" ON public.individual_lesson_sessions;
DROP POLICY IF EXISTS "Admins can manage all lesson sessions" ON public.individual_lesson_sessions;
DROP POLICY IF EXISTS "Authenticated users can view lesson sessions" ON public.individual_lesson_sessions;

-- Создаем новые улучшенные политики

-- Политика для просмотра
CREATE POLICY "Users can view lesson sessions"
  ON public.individual_lesson_sessions
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Политика для вставки - проверяем доступ через individual_lessons
CREATE POLICY "Users can insert lesson sessions for their branches"
  ON public.individual_lesson_sessions
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      -- Админы могут все
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'::app_role
      )
      OR
      -- Пользователи могут добавлять сессии для уроков из своих филиалов
      EXISTS (
        SELECT 1 
        FROM public.individual_lessons il
        INNER JOIN public.profiles p ON p.id = auth.uid()
        WHERE il.id = individual_lesson_sessions.individual_lesson_id
          AND (
            il.branch = p.branch
            OR EXISTS (
              SELECT 1 FROM public.manager_branches mb
              WHERE mb.manager_id = auth.uid() AND mb.branch = il.branch
            )
          )
      )
    )
  );

-- Политика для обновления
CREATE POLICY "Users can update lesson sessions for their branches"
  ON public.individual_lesson_sessions
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'::app_role
      )
      OR
      EXISTS (
        SELECT 1 
        FROM public.individual_lessons il
        INNER JOIN public.profiles p ON p.id = auth.uid()
        WHERE il.id = individual_lesson_sessions.individual_lesson_id
          AND (
            il.branch = p.branch
            OR EXISTS (
              SELECT 1 FROM public.manager_branches mb
              WHERE mb.manager_id = auth.uid() AND mb.branch = il.branch
            )
          )
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'::app_role
      )
      OR
      EXISTS (
        SELECT 1 
        FROM public.individual_lessons il
        INNER JOIN public.profiles p ON p.id = auth.uid()
        WHERE il.id = individual_lesson_sessions.individual_lesson_id
          AND (
            il.branch = p.branch
            OR EXISTS (
              SELECT 1 FROM public.manager_branches mb
              WHERE mb.manager_id = auth.uid() AND mb.branch = il.branch
            )
          )
      )
    )
  );

-- Политика для удаления
CREATE POLICY "Users can delete lesson sessions for their branches"
  ON public.individual_lesson_sessions
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'::app_role
      )
      OR
      EXISTS (
        SELECT 1 
        FROM public.individual_lessons il
        INNER JOIN public.profiles p ON p.id = auth.uid()
        WHERE il.id = individual_lesson_sessions.individual_lesson_id
          AND (
            il.branch = p.branch
            OR EXISTS (
              SELECT 1 FROM public.manager_branches mb
              WHERE mb.manager_id = auth.uid() AND mb.branch = il.branch
            )
          )
      )
    )
  );