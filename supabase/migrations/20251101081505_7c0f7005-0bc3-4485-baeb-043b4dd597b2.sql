-- Step 1: Create teacher record for Daniil Pyshnov
INSERT INTO teachers (
  profile_id, 
  first_name, 
  last_name, 
  email, 
  phone, 
  branch, 
  is_active,
  subjects
)
SELECT
  '0a5d61cf-f502-464c-887a-86ad763cf7e7',
  'Даниил',
  'Пышнов',
  'pyshnov89@mail.ru',
  '+7 (000) 000-00-00',
  'Окская',
  true,
  ARRAY['Английский язык']
WHERE NOT EXISTS (
  SELECT 1 FROM teachers WHERE profile_id = '0a5d61cf-f502-464c-887a-86ad763cf7e7'
);

-- Step 2: Link teacher to all test branches for multi-school testing
WITH new_teacher AS (
  SELECT id FROM teachers WHERE profile_id = '0a5d61cf-f502-464c-887a-86ad763cf7e7'
)
INSERT INTO teacher_branches (teacher_id, branch_id)
SELECT 
  new_teacher.id,
  ob.id
FROM new_teacher
CROSS JOIN organization_branches ob
WHERE ob.name IN ('Окская', 'Котельники', 'Новокосино', 'Стахановская')
  AND NOT EXISTS (
    SELECT 1 FROM teacher_branches tb 
    WHERE tb.teacher_id = new_teacher.id 
    AND tb.branch_id = ob.id
  );