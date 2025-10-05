-- Удаляем старую политику UPDATE
DROP POLICY IF EXISTS "Users can update lesson sessions for their branches" ON public.individual_lesson_sessions;

-- Создаем новую более гибкую политику UPDATE
CREATE POLICY "Users can update lesson sessions for their branches or payment info"
ON public.individual_lesson_sessions
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Админы могут все
    has_role(auth.uid(), 'admin'::app_role)
    -- Или создатель сессии
    OR created_by = auth.uid()
    -- Или пользователи из того же филиала
    OR EXISTS (
      SELECT 1
      FROM individual_lessons il
      WHERE il.id = individual_lesson_sessions.individual_lesson_id
      AND il.branch = ANY (get_user_branches(auth.uid()))
    )
    -- Или менеджеры/бухгалтеры могут обновлять платежную информацию
    OR (
      (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
      AND EXISTS (
        SELECT 1
        FROM individual_lessons il
        WHERE il.id = individual_lesson_sessions.individual_lesson_id
      )
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM individual_lessons il
      WHERE il.id = individual_lesson_sessions.individual_lesson_id
      AND il.branch = ANY (get_user_branches(auth.uid()))
    )
    OR (
      (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
      AND EXISTS (
        SELECT 1
        FROM individual_lessons il
        WHERE il.id = individual_lesson_sessions.individual_lesson_id
      )
    )
  )
);