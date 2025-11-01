-- Миграция для заполнения teacher_branches из существующих данных teachers.branch
-- Создаем связи преподавателей с филиалами на основе существующего поля branch

INSERT INTO teacher_branches (teacher_id, branch_id)
SELECT DISTINCT
  t.id,
  ob.id
FROM teachers t
INNER JOIN organization_branches ob ON ob.name = t.branch
WHERE t.branch IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM teacher_branches tb 
    WHERE tb.teacher_id = t.id AND tb.branch_id = ob.id
  )
ON CONFLICT (teacher_id, branch_id) DO NOTHING;