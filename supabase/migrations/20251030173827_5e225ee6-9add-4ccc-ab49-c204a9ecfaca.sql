
-- 1. Добавляем profile_id к teachers
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_teachers_profile_id ON teachers(profile_id);

-- 2. Создаем или обновляем запись учителя для Марии Ивановой
INSERT INTO teachers (
  id, 
  profile_id, 
  first_name, 
  last_name, 
  email, 
  subjects, 
  categories, 
  branch, 
  is_active
)
VALUES (
  'c33657a1-9e49-441b-83d4-859cce549860',
  'c33657a1-9e49-441b-83d4-859cce549860',
  'Мария',
  'Иванова',
  '79991234568@okeyenglish.ru',
  ARRAY['Английский язык'],
  ARRAY['Взрослые', 'Дети'],
  'Окская',
  true
)
ON CONFLICT (id) DO UPDATE SET
  profile_id = EXCLUDED.profile_id,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  subjects = EXCLUDED.subjects,
  categories = EXCLUDED.categories,
  is_active = true;

-- 3. Добавляем ставки для учителя (используем profile_id)
INSERT INTO teacher_rates (
  teacher_id, 
  rate_type, 
  rate_per_academic_hour, 
  branch, 
  is_active, 
  currency, 
  valid_from, 
  notes
)
VALUES 
  (
    'c33657a1-9e49-441b-83d4-859cce549860',
    'branch',
    500,
    'Окская',
    true,
    'RUB',
    CURRENT_DATE,
    'Групповые занятия'
  ),
  (
    'c33657a1-9e49-441b-83d4-859cce549860',
    'personal',
    700,
    'Окская',
    true,
    'RUB',
    CURRENT_DATE,
    'Индивидуальные занятия'
  )
ON CONFLICT DO NOTHING;
