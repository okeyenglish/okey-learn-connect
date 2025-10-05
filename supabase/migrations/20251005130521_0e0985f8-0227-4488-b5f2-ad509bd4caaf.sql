-- Добавляем дополнительные курсы для взрослых и подростков
INSERT INTO public.group_course_prices (course_name, duration_minutes, price_8_lessons, price_24_lessons, price_80_lessons)
VALUES 
  ('Intermediate', 80, 13990, 39000, 60000),
  ('Beginner', 80, 13990, 39000, 60000),
  ('Elementary', 80, 13990, 39000, 60000),
  ('Pre-Intermediate', 80, 13990, 39000, 60000),
  ('Upper-Intermediate', 80, 13990, 39000, 60000),
  ('Advanced', 80, 13990, 39000, 60000)
ON CONFLICT (course_name) DO UPDATE SET
  duration_minutes = EXCLUDED.duration_minutes,
  price_8_lessons = EXCLUDED.price_8_lessons,
  price_24_lessons = EXCLUDED.price_24_lessons,
  price_80_lessons = EXCLUDED.price_80_lessons;