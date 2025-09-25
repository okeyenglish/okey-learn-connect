-- Создаем тестовую группу Super Safari 1 для проверки планирования уроков
INSERT INTO learning_groups (
  name,
  branch,
  subject,
  level,
  responsible_teacher,
  capacity,
  current_students,
  status,
  category
) VALUES (
  'Super Safari 1 - Тест',
  'Окская',
  'Английский',
  'Super Safari 1',
  'Тестовый Преподаватель',
  8,
  5,
  'active',
  'preschool'
);

-- Создаем тестового преподавателя если его нет
INSERT INTO teachers (
  first_name,
  last_name,
  email,
  phone,
  branch,
  subjects,
  is_active
) VALUES (
  'Тестовый',
  'Преподаватель',
  'test.teacher@okey-english.ru',
  '+7-999-123-4567',
  'Окская',
  ARRAY['Английский'],
  true
) ON CONFLICT DO NOTHING;