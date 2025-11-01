-- Удаляем дубли в teacher_branches (оставляем только уникальные пары teacher_id + branch_id)
-- Это безопасная операция, так как у нас есть UNIQUE constraint на (teacher_id, branch_id)

-- Сначала создадим временную таблицу с уникальными записями
CREATE TEMP TABLE temp_teacher_branches AS
SELECT DISTINCT ON (teacher_id, branch_id)
  id, teacher_id, branch_id, created_at
FROM teacher_branches
ORDER BY teacher_id, branch_id, created_at;

-- Удалим все записи
DELETE FROM teacher_branches;

-- Вставим обратно только уникальные
INSERT INTO teacher_branches (id, teacher_id, branch_id, created_at)
SELECT id, teacher_id, branch_id, created_at
FROM temp_teacher_branches
ON CONFLICT (teacher_id, branch_id) DO NOTHING;