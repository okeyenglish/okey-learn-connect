-- Создаем тестовую группу
INSERT INTO public.learning_groups (
  name,
  branch,
  subject,
  level,
  status,
  category,
  group_type,
  payment_method,
  capacity,
  current_students,
  responsible_teacher,
  schedule_days,
  schedule_time,
  schedule_room,
  period_start,
  period_end,
  default_price,
  academic_hours,
  textbook,
  description,
  is_active
) VALUES (
  'Тестовая группа Kids Box 1',
  'Окская',
  'Английский',
  'Beginner',
  'active',
  'all',
  'general',
  'per_lesson',
  8,
  5,
  'Анна Петрова',
  ARRAY['monday', 'wednesday', 'friday'],
  '16:00-17:30',
  'Аудитория 101',
  '2025-01-15',
  '2025-06-15',
  1500.00,
  80,
  'Kids Box 1',
  'Тестовая группа для демонстрации автоматического расписания курса Kids Box 1',
  true
);

-- Получаем ID созданной группы и курса Kids Box 1, затем генерируем расписание
DO $$
DECLARE
  group_uuid UUID;
  course_uuid UUID;
BEGIN
  -- Получаем ID созданной группы
  SELECT id INTO group_uuid 
  FROM public.learning_groups 
  WHERE name = 'Тестовая группа Kids Box 1' 
  LIMIT 1;
  
  -- Получаем ID курса Kids Box 1
  SELECT id INTO course_uuid 
  FROM public.courses 
  WHERE slug = 'kids-box-1' 
  LIMIT 1;
  
  -- Если курс найден, генерируем расписание
  IF course_uuid IS NOT NULL AND group_uuid IS NOT NULL THEN
    PERFORM public.generate_course_schedule(
      p_group_id := group_uuid,
      p_course_id := course_uuid,
      p_start_date := '2025-01-15',
      p_schedule_days := ARRAY['monday', 'wednesday', 'friday'],
      p_start_time := '16:00',
      p_end_time := '17:30',
      p_teacher_name := 'Анна Петрова',
      p_classroom := 'Аудитория 101',
      p_branch := 'Окская',
      p_total_lessons := 80
    );
  END IF;
END $$;