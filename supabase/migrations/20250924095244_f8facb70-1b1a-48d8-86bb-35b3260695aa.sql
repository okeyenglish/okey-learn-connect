-- Создаем группу Intermediate A1 и связываем студентов с занятиями

-- Создаем группу Intermediate A1
INSERT INTO public.learning_groups (
  id,
  name, 
  branch, 
  subject, 
  level, 
  responsible_teacher, 
  capacity, 
  current_students,
  status,
  schedule_days,
  schedule_time,
  schedule_room,
  created_at, 
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440010',
  'Intermediate A1',
  'Окская',
  'Английский',
  'A1',
  'Мария Иванова',
  12,
  5,
  'active',
  ARRAY['monday', 'wednesday', 'friday'],
  '18:00-19:30',
  'Аудитория 2',
  now(),
  now()
);

-- Создаем lesson_sessions для группы
INSERT INTO public.lesson_sessions (
  id,
  group_id,
  lesson_date,
  start_time,
  end_time,
  day_of_week,
  teacher_name,
  classroom,
  branch,
  status,
  created_at,
  updated_at
) VALUES 
  (
    '650e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440010',
    '2025-09-29',
    '18:00',
    '19:30',
    'monday',
    'Мария Иванова',
    'Аудитория 2',
    'Окская',
    'scheduled',
    now(),
    now()
  ),
  (
    '650e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440010',
    '2025-10-01',
    '18:00',
    '19:30',
    'wednesday',
    'Мария Иванова',
    'Аудитория 2',
    'Окская',
    'scheduled',
    now(),
    now()
  );

-- Связываем студентов с занятиями группы
INSERT INTO public.student_lesson_sessions (
  student_id,
  lesson_session_id,
  created_at,
  updated_at
) VALUES
  -- Связываем всех доступных студентов с первым занятием
  ('1d072b49-1924-4403-a1e2-164fd9db9b4f', '650e8400-e29b-41d4-a716-446655440001', now(), now()),
  ('8bf766fe-be13-4d4b-a40e-abb3085bc9b8', '650e8400-e29b-41d4-a716-446655440001', now(), now()),
  ('8fba7f9d-d9f8-46f7-b7b8-bca64ca665f7', '650e8400-e29b-41d4-a716-446655440001', now(), now()),
  ('c1ac0d36-8e2d-47d4-bfd0-c6aaa1ff018b', '650e8400-e29b-41d4-a716-446655440001', now(), now()),
  ('079feab8-4b25-4306-bb37-19187057cc3e', '650e8400-e29b-41d4-a716-446655440001', now(), now()),
  
  -- Связываем со вторым занятием
  ('1d072b49-1924-4403-a1e2-164fd9db9b4f', '650e8400-e29b-41d4-a716-446655440002', now(), now()),
  ('8bf766fe-be13-4d4b-a40e-abb3085bc9b8', '650e8400-e29b-41d4-a716-446655440002', now(), now()),
  ('8fba7f9d-d9f8-46f7-b7b8-bca64ca665f7', '650e8400-e29b-41d4-a716-446655440002', now(), now()),
  ('c1ac0d36-8e2d-47d4-bfd0-c6aaa1ff018b', '650e8400-e29b-41d4-a716-446655440002', now(), now()),
  ('079feab8-4b25-4306-bb37-19187057cc3e', '650e8400-e29b-41d4-a716-446655440002', now(), now());

-- Создаем студента "Петров Алексей" для индивидуальных занятий
INSERT INTO public.students (
  id,
  name,
  first_name,
  last_name,
  age,
  family_group_id,
  status,
  created_at,
  updated_at
) VALUES (
  '750e8400-e29b-41d4-a716-446655440010',
  'Петров Алексей',
  'Алексей',
  'Петров',
  25,
  '550e8400-e29b-41d4-a716-446655440001',
  'active',
  now(),
  now()
);

-- Обновляем индивидуальное занятие для Петрова Алексея  
UPDATE public.individual_lessons 
SET student_id = '750e8400-e29b-41d4-a716-446655440010'
WHERE student_name = 'Петров Алексей' AND teacher_name = 'Мария Иванова';

-- Если такого занятия нет, создаем его
INSERT INTO public.individual_lessons (
  student_name,
  branch,
  subject,
  level,
  teacher_name,
  status,
  schedule_time,
  price_per_lesson,
  academic_hours,
  student_id,
  created_at,
  updated_at
) 
SELECT 
  'Петров Алексей',
  'Окская',
  'Английский',
  'Upper-Intermediate',
  'Мария Иванова',
  'active',
  'Вт, Чт 18:00-19:30',
  2500,
  40,
  '750e8400-e29b-41d4-a716-446655440010',
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.individual_lessons 
  WHERE student_name = 'Петров Алексей' AND teacher_name = 'Мария Иванова'
);