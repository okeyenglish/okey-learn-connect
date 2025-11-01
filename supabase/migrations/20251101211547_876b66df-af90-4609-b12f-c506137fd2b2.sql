-- Добавляем политику для преподавателей - видеть коллег из своих филиалов
CREATE POLICY "Преподаватели видят коллег из своих филиалов"
ON public.teachers
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM teacher_branches tb1
    JOIN teacher_branches tb2 ON tb1.branch_id = tb2.branch_id
    JOIN profiles p ON p.id = auth.uid()
    WHERE tb2.teacher_id = teachers.id
      AND tb1.teacher_id IN (
        SELECT t.id FROM teachers t WHERE t.profile_id = auth.uid()
      )
  )
);