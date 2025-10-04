-- Добавляем новые аудитории во все филиалы
INSERT INTO public.classrooms (name, branch, capacity, is_online, is_active)
VALUES
  -- Котельники
  ('London', 'Котельники', 10, false, true),
  ('Cambridge', 'Котельники', 10, false, true),
  ('Oxford', 'Котельники', 10, false, true),
  ('New York', 'Котельники', 10, false, true),
  ('Washington', 'Котельники', 10, false, true),
  ('Chicago', 'Котельники', 10, false, true),
  ('Las Vegas', 'Котельники', 10, false, true),
  
  -- Новокосино
  ('London', 'Новокосино', 10, false, true),
  ('Cambridge', 'Новокосино', 10, false, true),
  ('Oxford', 'Новокосино', 10, false, true),
  ('New York', 'Новокосино', 10, false, true),
  ('Washington', 'Новокосино', 10, false, true),
  ('Chicago', 'Новокосино', 10, false, true),
  ('Las Vegas', 'Новокосино', 10, false, true),
  
  -- Окская
  ('London', 'Окская', 10, false, true),
  ('Cambridge', 'Окская', 10, false, true),
  ('Oxford', 'Окская', 10, false, true),
  ('New York', 'Окская', 10, false, true),
  ('Washington', 'Окская', 10, false, true),
  ('Chicago', 'Окская', 10, false, true),
  ('Las Vegas', 'Окская', 10, false, true),
  
  -- Стахановская
  ('London', 'Стахановская', 10, false, true),
  ('Cambridge', 'Стахановская', 10, false, true),
  ('Oxford', 'Стахановская', 10, false, true),
  ('New York', 'Стахановская', 10, false, true),
  ('Washington', 'Стахановская', 10, false, true),
  ('Chicago', 'Стахановская', 10, false, true),
  ('Las Vegas', 'Стахановская', 10, false, true),
  
  -- Солнцево
  ('London', 'Солнцево', 10, false, true),
  ('Cambridge', 'Солнцево', 10, false, true),
  ('Oxford', 'Солнцево', 10, false, true),
  ('New York', 'Солнцево', 10, false, true),
  ('Washington', 'Солнцево', 10, false, true),
  ('Chicago', 'Солнцево', 10, false, true),
  ('Las Vegas', 'Солнцево', 10, false, true),
  
  -- Мытищи
  ('London', 'Мытищи', 10, false, true),
  ('Cambridge', 'Мытищи', 10, false, true),
  ('Oxford', 'Мытищи', 10, false, true),
  ('New York', 'Мытищи', 10, false, true),
  ('Washington', 'Мытищи', 10, false, true),
  ('Chicago', 'Мытищи', 10, false, true),
  ('Las Vegas', 'Мытищи', 10, false, true),
  
  -- Люберцы
  ('London', 'Люберцы', 10, false, true),
  ('Cambridge', 'Люберцы', 10, false, true),
  ('Oxford', 'Люберцы', 10, false, true),
  ('New York', 'Люберцы', 10, false, true),
  ('Washington', 'Люберцы', 10, false, true),
  ('Chicago', 'Люберцы', 10, false, true),
  ('Las Vegas', 'Люберцы', 10, false, true),
  
  -- Красная горка
  ('London', 'Красная горка', 10, false, true),
  ('Cambridge', 'Красная горка', 10, false, true),
  ('Oxford', 'Красная горка', 10, false, true),
  ('New York', 'Красная горка', 10, false, true),
  ('Washington', 'Красная горка', 10, false, true),
  ('Chicago', 'Красная горка', 10, false, true),
  ('Las Vegas', 'Красная горка', 10, false, true),
  
  -- Онлайн школа
  ('London', 'Онлайн школа', 10, true, true),
  ('Cambridge', 'Онлайн школа', 10, true, true),
  ('Oxford', 'Онлайн школа', 10, true, true),
  ('New York', 'Онлайн школа', 10, true, true),
  ('Washington', 'Онлайн школа', 10, true, true),
  ('Chicago', 'Онлайн школа', 10, true, true),
  ('Las Vegas', 'Онлайн школа', 10, true, true)
ON CONFLICT DO NOTHING;