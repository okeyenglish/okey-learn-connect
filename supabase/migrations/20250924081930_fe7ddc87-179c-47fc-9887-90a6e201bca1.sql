-- Обновляем роль тестового пользователя на student
UPDATE user_roles 
SET role = 'student' 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = '79991234567@okeyenglish.ru'
);

-- Обновляем профиль тестового пользователя с номером телефона
UPDATE profiles 
SET phone = '+79991234567'
WHERE id = (
  SELECT id FROM auth.users WHERE email = '79991234567@okeyenglish.ru'
);

-- Создаем семейную группу для тестового студента, если её еще нет
INSERT INTO family_groups (id, name, branch)
SELECT gen_random_uuid(), 'Семья Тестовых', 'Окская'
WHERE NOT EXISTS (
  SELECT 1 FROM family_groups WHERE name = 'Семья Тестовых'
);

-- Создаем запись студента
DO $$
DECLARE
  user_uuid uuid;
  family_id uuid;
  student_exists boolean;
BEGIN
  -- Получаем ID пользователя
  SELECT id INTO user_uuid FROM auth.users WHERE email = '79991234567@okeyenglish.ru';
  
  -- Получаем ID семейной группы
  SELECT id INTO family_id FROM family_groups WHERE name = 'Семья Тестовых' LIMIT 1;
  
  -- Проверяем, существует ли студент
  SELECT EXISTS(SELECT 1 FROM students WHERE phone = '+79991234567') INTO student_exists;
  
  -- Создаем студента, если его еще нет
  IF NOT student_exists THEN
    INSERT INTO students (
      id,
      name,
      first_name,
      last_name,
      phone,
      age,
      family_group_id,
      status
    )
    VALUES (
      gen_random_uuid(),
      'Анна Тестова',
      'Анна',
      'Тестова',
      '+79991234567',
      25,
      family_id,
      'active'
    );
  END IF;
END $$;

-- Создаем тестовый курс для студента
DO $$
DECLARE
  student_uuid uuid;
  course_exists boolean;
BEGIN
  -- Получаем ID студента
  SELECT id INTO student_uuid FROM students WHERE phone = '+79991234567';
  
  -- Проверяем, существует ли курс
  SELECT EXISTS(
    SELECT 1 FROM student_courses 
    WHERE student_id = student_uuid AND course_name = 'Общий английский - Intermediate'
  ) INTO course_exists;
  
  -- Создаем курс, если его еще нет
  IF NOT course_exists AND student_uuid IS NOT NULL THEN
    INSERT INTO student_courses (
      student_id,
      course_name,
      start_date,
      end_date,
      next_payment_date,
      payment_amount,
      is_active
    )
    VALUES (
      student_uuid,
      'Общий английский - Intermediate',
      CURRENT_DATE - INTERVAL '1 month',
      CURRENT_DATE + INTERVAL '5 months',
      CURRENT_DATE + INTERVAL '1 month',
      8000,
      true
    );
  END IF;
END $$;