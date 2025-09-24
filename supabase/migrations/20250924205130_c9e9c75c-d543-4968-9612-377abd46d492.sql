-- Добавляем дополнительные курсы и данные для полной функциональности

-- Добавляем остальные курсы
INSERT INTO public.courses (slug, title, description, sort_order)
VALUES 
  ('super-safari-1', 'Super Safari 1', 'Английский для малышей 3-5 лет', 1),
  ('super-safari-2', 'Super Safari 2', 'Английский для малышей 4-6 лет', 2),
  ('super-safari-3', 'Super Safari 3', 'Английский для малышей 5-7 лет', 3),
  ('kids-box-starter', 'Kid''s Box Starter', 'Стартовый уровень для детей 5-7 лет', 4),
  ('kids-box-2', 'Kid''s Box 2', 'Английский для детей 7-9 лет', 11),
  ('kids-box-3-4', 'Kid''s Box 3+4', 'Английский для детей 8-11 лет', 12),
  ('prepare-1', 'Prepare 1', 'Подготовка к экзаменам уровень 1', 20),
  ('prepare-2', 'Prepare 2', 'Подготовка к экзаменам уровень 2', 21),
  ('empower-1', 'Empower 1', 'Английский для подростков уровень 1', 30),
  ('empower-2', 'Empower 2', 'Английский для подростков уровень 2', 31)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- Добавляем Unit 2 для Kid's Box 1
WITH course_ref AS (
  SELECT id FROM public.courses WHERE slug = 'kids-box-1'
)
INSERT INTO public.course_units (course_id, unit_number, title, description, lessons_count, vocabulary, grammar, sort_order)
SELECT id, 2, 'Unit 2 — My school', 'Школьные предметы, числа 11-20, дни недели', 7,
       'Школьные предметы, числа 11-20, дни недели', 'This is a... I have got... What day is it?', 2
FROM course_ref
ON CONFLICT (course_id, unit_number) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  lessons_count = EXCLUDED.lessons_count,
  vocabulary = EXCLUDED.vocabulary,
  grammar = EXCLUDED.grammar;

-- Добавляем уроки для Unit 2 Kid's Box 1
WITH unit_ref AS (
  SELECT cu.id as unit_id FROM public.course_units cu
  JOIN public.courses c ON c.id = cu.course_id
  WHERE c.slug = 'kids-box-1' AND cu.unit_number = 2
)
INSERT INTO public.unit_lessons (unit_id, lesson_number, title, topics, vocabulary, grammar, activities, materials, sort_order)
VALUES
  ((SELECT unit_id FROM unit_ref), 8, 'School subjects',
   '["Школьные предметы", "Школьные принадлежности"]'::jsonb,
   '["Maths", "English", "Art", "book", "pen", "pencil"]'::jsonb,
   '["This is a..."]'::jsonb,
   '["Экскурсия по школе", "Игра School bag", "Расписание"]'::jsonb,
   '["AB p.11", "CB p.18-19", "Audio CD1 Track 16-18"]'::jsonb,
   8),
  ((SELECT unit_id FROM unit_ref), 9, 'Numbers 11-20',
   '["Числа от 11 до 20", "Счёт предметов"]'::jsonb,
   '["eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"]'::jsonb,
   '["How many...?"]'::jsonb,
   '["Счётные игры", "Математические задачи", "Песня Numbers"]'::jsonb,
   '["AB p.12", "CB p.20-21", "Audio CD1 Track 19-21"]'::jsonb,
   9),
  ((SELECT unit_id FROM unit_ref), 10, 'Days of the week',
   '["Дни недели", "Школьное расписание"]'::jsonb,
   '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]'::jsonb,
   '["What day is it?"]'::jsonb,
   '["Календарь класса", "Игра Week circle", "Мой день"]'::jsonb,
   '["AB p.13", "CB p.22-23", "Audio CD1 Track 22-24"]'::jsonb,
   10)
ON CONFLICT (unit_id, lesson_number) DO UPDATE SET
  title = EXCLUDED.title,
  topics = EXCLUDED.topics,
  vocabulary = EXCLUDED.vocabulary,
  grammar = EXCLUDED.grammar,
  activities = EXCLUDED.activities,
  materials = EXCLUDED.materials;

-- Добавляем данные для Super Safari 1
WITH course_ref AS (
  SELECT id FROM public.courses WHERE slug = 'super-safari-1'
)
INSERT INTO public.course_units (course_id, unit_number, title, description, lessons_count, vocabulary, grammar, sort_order)
SELECT id, 1, 'Unit 1 — Hello Leo!', 'Знакомство с героями, приветствие, цвета', 6,
       'Цвета, приветствие, имена животных', 'Hello! What''s your name? Red, blue, yellow', 1
FROM course_ref
ON CONFLICT (course_id, unit_number) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  lessons_count = EXCLUDED.lessons_count,
  vocabulary = EXCLUDED.vocabulary,
  grammar = EXCLUDED.grammar;

-- Добавляем уроки для Super Safari 1
WITH unit_ref AS (
  SELECT cu.id as unit_id FROM public.course_units cu
  JOIN public.courses c ON c.id = cu.course_id
  WHERE c.slug = 'super-safari-1' AND cu.unit_number = 1
)
INSERT INTO public.unit_lessons (unit_id, lesson_number, title, topics, vocabulary, grammar, activities, materials, sort_order)
VALUES
  ((SELECT unit_id FROM unit_ref), 1, 'Hello Leo!',
   '["Знакомство с Leo", "Приветствие"]'::jsonb,
   '["hello", "Leo", "lion"]'::jsonb,
   '["Hello!"]'::jsonb,
   '["Песня Hello Leo", "Знакомство с персонажами", "Раскрашивание"]'::jsonb,
   '["PB p.4-5", "AB p.4", "Audio CD1 Track 1-2"]'::jsonb,
   1),
  ((SELECT unit_id FROM unit_ref), 2, 'Colors',
   '["Основные цвета", "Цветные предметы"]'::jsonb,
   '["red", "blue", "yellow"]'::jsonb,
   '["It''s red"]'::jsonb,
   '["Цветная игра", "Раскрашивание", "Песня Colors"]'::jsonb,
   '["PB p.6-7", "AB p.5", "Audio CD1 Track 3-4"]'::jsonb,
   2)
ON CONFLICT (unit_id, lesson_number) DO UPDATE SET
  title = EXCLUDED.title,
  topics = EXCLUDED.topics,
  vocabulary = EXCLUDED.vocabulary,
  grammar = EXCLUDED.grammar,
  activities = EXCLUDED.activities,
  materials = EXCLUDED.materials;