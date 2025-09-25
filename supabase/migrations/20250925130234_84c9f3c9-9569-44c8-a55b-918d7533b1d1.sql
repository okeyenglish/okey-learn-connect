-- Создаем тестовое занятие Super Safari 1 на сегодня
INSERT INTO lesson_sessions (
  group_id,
  teacher_name,
  branch,
  classroom,
  lesson_date,
  start_time,
  end_time,
  day_of_week,
  status
) VALUES (
  (SELECT id FROM learning_groups WHERE name = 'Super Safari 1 - Тест' LIMIT 1),
  'Тестовый Преподаватель',
  'Окская',
  'Аудитория 1',
  CURRENT_DATE,
  '10:00',
  '11:20',
  'wednesday',
  'scheduled'
);