-- Обновляем профиль преподавателя (если еще не обновлен)
UPDATE public.profiles 
SET department = 'teacher' 
WHERE email = '79991234568@okeyenglish.ru' AND department IS NULL;

-- Создаем тестовых студентов (если их еще нет)
INSERT INTO public.students (id, name, first_name, last_name, age, family_group_id, status, phone, created_at, updated_at) 
SELECT 
  gen_random_uuid(),
  'Петров Алексей Дмитриевич',
  'Алексей',
  'Петров',
  12,
  '550e8400-e29b-41d4-a716-446655440001',
  'active',
  '+79161234567',
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM students WHERE first_name = 'Алексей' AND last_name = 'Петров');

INSERT INTO public.students (id, name, first_name, last_name, age, family_group_id, status, phone, created_at, updated_at) 
SELECT 
  gen_random_uuid(),
  'Петрова Анна Дмитриевна',
  'Анна',
  'Петрова',
  10,
  '550e8400-e29b-41d4-a716-446655440001',
  'active',
  '+79161234567',
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM students WHERE first_name = 'Анна' AND last_name = 'Петрова');

INSERT INTO public.students (id, name, first_name, last_name, age, family_group_id, status, phone, created_at, updated_at) 
SELECT 
  gen_random_uuid(),
  'Сидоров Михаил Андреевич',
  'Михаил',
  'Сидоров',
  14,
  '550e8400-e29b-41d4-a716-446655440002',
  'active',
  '+79162345678',
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM students WHERE first_name = 'Михаил' AND last_name = 'Сидоров');

INSERT INTO public.students (id, name, first_name, last_name, age, family_group_id, status, phone, created_at, updated_at) 
SELECT 
  gen_random_uuid(),
  'Козлова Елена Сергеевна',
  'Елена',
  'Козлова',
  16,
  '550e8400-e29b-41d4-a716-446655440003',
  'active',
  '+79163456789',
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM students WHERE first_name = 'Елена' AND last_name = 'Козлова');

-- Создаем групповые занятия
INSERT INTO public.learning_groups (id, name, branch, subject, level, responsible_teacher, capacity, current_students, status, schedule_time, schedule_room, created_at, updated_at) 
SELECT 
  gen_random_uuid(),
  'Beginner A1 (Мария Иванова)',
  'Окская',
  'Английский',
  'A1',
  'Мария Иванова',
  8,
  3,
  'active',
  'Пн, Ср, Пт 15:00-16:30',
  'Аудитория 201',
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM learning_groups WHERE responsible_teacher = 'Мария Иванова' AND level = 'A1');

INSERT INTO public.learning_groups (id, name, branch, subject, level, responsible_teacher, capacity, current_students, status, schedule_time, schedule_room, created_at, updated_at) 
SELECT 
  gen_random_uuid(),
  'Elementary A2 (Мария Иванова)',
  'Окская',
  'Английский',
  'A2',
  'Мария Иванова',
  6,
  2,
  'active',
  'Вт, Чт 16:00-17:30',
  'Аудитория 203',
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM learning_groups WHERE responsible_teacher = 'Мария Иванова' AND level = 'A2');

-- Создаем индивидуальные занятия
INSERT INTO public.individual_lessons (id, student_name, branch, subject, level, teacher_name, status, schedule_time, price_per_lesson, academic_hours, created_at, updated_at, student_id) 
SELECT 
  gen_random_uuid(),
  'Козлова Елена Сергеевна',
  'Окская',
  'Английский',
  'B1',
  'Мария Иванова',
  'active',
  'Сб 10:00-11:30',
  2500,
  20,
  now(),
  now(),
  s.id
FROM students s
WHERE s.first_name = 'Елена' AND s.last_name = 'Козлова'
AND NOT EXISTS (SELECT 1 FROM individual_lessons WHERE teacher_name = 'Мария Иванова' AND student_name = 'Козлова Елена Сергеевна');

INSERT INTO public.individual_lessons (id, student_name, branch, subject, level, teacher_name, status, schedule_time, price_per_lesson, academic_hours, created_at, updated_at, student_id) 
SELECT 
  gen_random_uuid(),
  'Сидоров Михаил Андреевич',
  'Окская',
  'Английский',
  'A2',
  'Мария Иванова',
  'active',
  'Сб 12:00-13:30',
  2500,
  15,
  now(),
  now(),
  s.id
FROM students s
WHERE s.first_name = 'Михаил' AND s.last_name = 'Сидоров'
AND NOT EXISTS (SELECT 1 FROM individual_lessons WHERE teacher_name = 'Мария Иванова' AND student_name = 'Сидоров Михаил Андреевич');