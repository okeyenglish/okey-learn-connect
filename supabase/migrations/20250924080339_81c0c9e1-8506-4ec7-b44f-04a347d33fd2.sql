-- Создаем семейную группу для тестового ученика
INSERT INTO public.family_groups (id, name, branch)
VALUES (
  '10000000-0000-4000-8000-000000000001',
  'Семья Тестовых',
  'Окская'
)
ON CONFLICT (id) DO NOTHING;

-- Создаем тестового студента
INSERT INTO public.students (
  id, 
  name, 
  first_name, 
  last_name, 
  age, 
  phone, 
  family_group_id, 
  status,
  date_of_birth
)
VALUES (
  '20000000-0000-4000-8000-000000000001',
  'Анна Тестова',
  'Анна',
  'Тестова',
  12,
  '+79991234567',
  '10000000-0000-4000-8000-000000000001',
  'active',
  '2012-05-15'
)
ON CONFLICT (id) DO NOTHING;

-- Создаем курс для студента
INSERT INTO public.student_courses (
  id, 
  student_id, 
  course_name, 
  start_date, 
  is_active, 
  payment_amount,
  next_payment_date
)
VALUES (
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'Английский язык - Средний уровень',
  '2025-09-01',
  true,
  8000,
  '2025-10-01'
)
ON CONFLICT (id) DO NOTHING;

-- Создаем индивидуальные уроки для студента
INSERT INTO public.individual_lessons (
  id, 
  student_id, 
  student_name, 
  branch, 
  subject, 
  level, 
  teacher_name, 
  schedule_days, 
  schedule_time, 
  price_per_lesson,
  is_active,
  status,
  period_start,
  period_end
)
VALUES (
  '40000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'Анна Тестова',
  'Окская',
  'Английский',
  'Intermediate',
  'Анастасия Иванова',
  ARRAY['понедельник', 'среда'],
  '16:00-17:00',
  2000,
  true,
  'active',
  '2025-09-01',
  '2025-12-31'
)
ON CONFLICT (id) DO NOTHING;

-- Создаем занятия в расписании
INSERT INTO public.lesson_sessions (
  id,
  lesson_date,
  start_time,
  end_time,
  classroom,
  teacher_name,
  branch,
  status,
  day_of_week
)
VALUES 
(
  '50000000-0000-4000-8000-000000000001',
  '2025-09-25',
  '16:00:00',
  '17:00:00',
  'Аудитория 5',
  'Анастасия Иванова',
  'Окская',
  'scheduled',
  'wednesday'
),
(
  '50000000-0000-4000-8000-000000000002',
  '2025-09-27',
  '16:00:00',
  '17:00:00',
  'Аудитория 5',
  'Анастасия Иванова',
  'Окская',
  'scheduled',
  'friday'
),
(
  '50000000-0000-4000-8000-000000000003',
  '2025-09-30',
  '16:00:00',
  '17:00:00',
  'Аудитория 5',
  'Анастасия Иванова',
  'Окская',
  'scheduled',
  'monday'
)
ON CONFLICT (id) DO NOTHING;

-- Привязываем студента к занятиям
INSERT INTO public.student_lesson_sessions (student_id, lesson_session_id)
VALUES 
('20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002'),
('20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003')
ON CONFLICT (student_id, lesson_session_id) DO NOTHING;