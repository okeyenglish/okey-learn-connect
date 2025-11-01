-- Удаляем проблемную политику, которая вызывает бесконечную рекурсию
DROP POLICY IF EXISTS "Преподаватели видят коллег из своих филиалов" ON public.teachers;

-- Создаем корректную политику без рекурсии
-- Преподаватели могут видеть других преподавателей из тех же филиалов
CREATE POLICY "Преподаватели видят коллег"
ON public.teachers
FOR SELECT
TO public
USING (
  -- Либо это менеджер/админ (существующая политика)
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid() 
      AND (
        teachers.branch = p.branch 
        OR EXISTS (
          SELECT 1
          FROM manager_branches mb
          WHERE mb.manager_id = auth.uid() 
            AND mb.branch = teachers.branch
        )
      )
  )
  OR
  -- Либо это преподаватель, просматривающий коллег из своих филиалов
  EXISTS (
    SELECT 1
    FROM profiles p
    JOIN teachers current_teacher ON current_teacher.profile_id = p.id
    WHERE p.id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM teacher_branches tb1
        JOIN teacher_branches tb2 ON tb1.branch_id = tb2.branch_id
        WHERE tb1.teacher_id = current_teacher.id
          AND tb2.teacher_id = teachers.id
      )
  )
);