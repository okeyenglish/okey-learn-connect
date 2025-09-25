-- Insert missing units for Super Safari 1 course  
WITH course_data AS (
  SELECT id FROM public.courses WHERE slug = 'super-safari-1'
)
INSERT INTO public.course_units (course_id, title, unit_number, description, lessons_count, sort_order, vocabulary, grammar)
SELECT 
  cd.id,
  units.title,
  units.unit_number,
  units.description,
  units.lessons_count,
  units.sort_order,
  units.vocabulary,
  units.grammar
FROM course_data cd,
(VALUES 
  ('Motivational Classes', 0, 'Мотивационные уроки для начала обучения', 4, 0, 'Базовые фразы приветствия', 'Простые структуры'),
  ('Hello', 1, 'Знакомство и приветствие', 2, 1, 'Hello, goodbye, name', 'What''s your name?'),
  ('My Class', 2, 'Мой класс и школьные принадлежности', 8, 2, 'Classroom objects, school items', 'This is a...'),
  ('My Colours', 3, 'Изучение цветов', 8, 3, 'Red, blue, yellow, green, orange, purple, pink', 'What colour is it?'),
  ('My Family', 4, 'Моя семья', 8, 4, 'Mummy, daddy, grandma, grandpa, baby', 'This is my...'),
  ('My Toys', 5, 'Мои игрушки', 8, 5, 'Ball, car, doll, teddy bear, bike', 'I''ve got a...'),
  ('My Numbers', 6, 'Числа от 1 до 10', 6, 6, 'One, two, three, four, five, six, seven, eight, nine, ten', 'How many?'),
  ('My Pets', 7, 'Домашние животные', 8, 7, 'Cat, dog, fish, bird, rabbit', 'I''ve got a pet...'),
  ('My Food', 8, 'Еда и напитки', 8, 8, 'Apple, banana, sandwich, milk, cake', 'I like...'),
  ('My Clothes', 9, 'Одежда', 9, 9, 'T-shirt, trousers, dress, shoes, hat', 'I''m wearing...'),
  ('My Park', 10, 'Парк и активности', 7, 10, 'Slide, swing, tree, flower, ball', 'Let''s play...')
) AS units(title, unit_number, description, lessons_count, sort_order, vocabulary, grammar)
WHERE NOT EXISTS (
  SELECT 1 FROM public.course_units cu2 
  WHERE cu2.course_id = cd.id AND cu2.unit_number = units.unit_number
);