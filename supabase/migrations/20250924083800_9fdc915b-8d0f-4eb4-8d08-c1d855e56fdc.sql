-- Создаем тестового пользователя-преподавателя
-- Сначала создаем запись в auth.users (это будет выполнено через приложение)
-- Здесь мы создаем только профиль и связанные данные

-- Добавляем тестового преподавателя в таблицу teachers, если его еще нет
INSERT INTO teachers (
  id,
  first_name,
  last_name,
  email,
  phone,
  subjects,
  categories,
  branch,
  is_active
)
VALUES (
  gen_random_uuid(),
  'Мария',
  'Иванова',
  '79991234568@okeyenglish.ru',
  '+79991234568',
  ARRAY['Английский', 'Немецкий'],
  ARRAY['Дети', 'Взрослые'],
  'Окская',
  true
) 
ON CONFLICT DO NOTHING;

-- Создаем профиль для тестового преподавателя, если пользователь уже существует
DO $$
DECLARE
  teacher_user_id uuid;
BEGIN
  -- Проверяем, существует ли пользователь с таким email
  SELECT id INTO teacher_user_id FROM auth.users WHERE email = '79991234568@okeyenglish.ru';
  
  -- Если пользователь существует, обновляем/создаем профиль
  IF teacher_user_id IS NOT NULL THEN
    INSERT INTO profiles (
      id,
      first_name,
      last_name,
      email,
      phone,
      branch,
      department
    )
    VALUES (
      teacher_user_id,
      'Мария',
      'Иванова', 
      '79991234568@okeyenglish.ru',
      '+79991234568',
      'Окская',
      'education'
    )
    ON CONFLICT (id) 
    DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      phone = EXCLUDED.phone,
      branch = EXCLUDED.branch,
      department = EXCLUDED.department;

    -- Устанавливаем роль преподавателя
    INSERT INTO user_roles (user_id, role)
    VALUES (teacher_user_id, 'teacher')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;