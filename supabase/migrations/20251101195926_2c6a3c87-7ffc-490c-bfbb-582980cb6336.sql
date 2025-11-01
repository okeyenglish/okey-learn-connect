-- Исправляем RLS политику для app_installs
-- Проблема: teacher_id может быть profile_id или id из таблицы teachers

-- Удаляем старую политику
DROP POLICY IF EXISTS "Teachers can manage their installs" ON app_installs;

-- Создаем новую политику с правильной проверкой
-- Учитываем что teacher_id может быть auth.uid() напрямую или через связь с teachers
CREATE POLICY "Teachers can view their installs" ON app_installs
  FOR SELECT 
  USING (
    teacher_id = auth.uid() OR 
    teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid()) OR
    teacher_id IN (SELECT profile_id FROM teachers WHERE id = auth.uid())
  );

CREATE POLICY "Teachers can insert their installs" ON app_installs
  FOR INSERT 
  WITH CHECK (
    teacher_id = auth.uid() OR 
    teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid()) OR
    teacher_id IN (SELECT profile_id FROM teachers WHERE id = auth.uid())
  );

CREATE POLICY "Teachers can delete their installs" ON app_installs
  FOR DELETE 
  USING (
    teacher_id = auth.uid() OR 
    teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid()) OR
    teacher_id IN (SELECT profile_id FROM teachers WHERE id = auth.uid())
  );