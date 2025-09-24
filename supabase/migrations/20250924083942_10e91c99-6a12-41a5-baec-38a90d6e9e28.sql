-- Создаем тестовые занятия для преподавателя Мария Иванова
-- Сначала создаем группу для преподавателя
INSERT INTO learning_groups (
  id,
  name,
  subject,
  level,
  branch,
  responsible_teacher,
  capacity,
  current_students,
  is_active,
  status,
  period_start,
  period_end
)
VALUES (
  gen_random_uuid(),
  'Группа Intermediate A1',
  'Английский',
  'Intermediate',
  'Окская',
  'Иванова Мария',
  12,
  8,
  true,
  'active',
  CURRENT_DATE - INTERVAL '1 month',
  CURRENT_DATE + INTERVAL '5 months'
)
ON CONFLICT DO NOTHING;

-- Создаем занятия на сегодня и завтра для тестирования
DO $$
DECLARE
  group_uuid uuid;
BEGIN
  -- Получаем ID группы
  SELECT id INTO group_uuid FROM learning_groups 
  WHERE name = 'Группа Intermediate A1' AND responsible_teacher = 'Иванова Мария' 
  LIMIT 1;
  
  -- Создаем занятие на сегодня
  INSERT INTO lesson_sessions (
    id,
    lesson_date,
    start_time,
    end_time,
    classroom,
    teacher_name,
    branch,
    status,
    day_of_week,
    group_id,
    notes
  )
  VALUES (
    gen_random_uuid(),
    CURRENT_DATE,
    '10:00',
    '11:30',
    'Аудитория 1',
    'Иванова Мария',
    'Окская',
    'scheduled',
    CASE EXTRACT(DOW FROM CURRENT_DATE)
      WHEN 1 THEN 'monday'
      WHEN 2 THEN 'tuesday'
      WHEN 3 THEN 'wednesday'
      WHEN 4 THEN 'thursday'
      WHEN 5 THEN 'friday'
      WHEN 6 THEN 'saturday'
      WHEN 0 THEN 'sunday'
    END::day_of_week,
    group_uuid,
    'Урок по теме Present Perfect'
  );
  
  -- Создаем занятие на завтра
  INSERT INTO lesson_sessions (
    id,
    lesson_date,
    start_time,
    end_time,
    classroom,
    teacher_name,
    branch,
    status,
    day_of_week,
    group_id,
    notes
  )
  VALUES (
    gen_random_uuid(),
    CURRENT_DATE + INTERVAL '1 day',
    '14:00',
    '15:30',
    'Аудитория 2',
    'Иванова Мария',
    'Окская',
    'scheduled',
    CASE EXTRACT(DOW FROM CURRENT_DATE + INTERVAL '1 day')
      WHEN 1 THEN 'monday'
      WHEN 2 THEN 'tuesday'
      WHEN 3 THEN 'wednesday'
      WHEN 4 THEN 'thursday'
      WHEN 5 THEN 'friday'
      WHEN 6 THEN 'saturday'
      WHEN 0 THEN 'sunday'
    END::day_of_week,
    group_uuid,
    'Урок по теме Past Simple vs Past Continuous'
  );

  -- Создаем индивидуальное занятие
  INSERT INTO individual_lessons (
    id,
    student_name,
    subject,
    level,
    branch,
    teacher_name,
    price_per_lesson,
    academic_hours,
    is_active,
    status,
    period_start,
    period_end,
    schedule_time,
    notes
  )
  VALUES (
    gen_random_uuid(),
    'Петров Алексей',
    'Английский',
    'Upper-Intermediate',
    'Окская',
    'Иванова Мария',
    2500,
    40,
    true,
    'active',
    CURRENT_DATE - INTERVAL '2 weeks',
    CURRENT_DATE + INTERVAL '6 months',
    'Вт, Чт 18:00-19:30',
    'Подготовка к IELTS'
  );
END $$;