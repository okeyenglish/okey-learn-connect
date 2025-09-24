-- Обновляем lessons_count для Unit 1 (фактически есть 3 урока: 1, 2, 3)
UPDATE course_units 
SET lessons_count = 3 
WHERE id = '3900f5c9-b358-43e7-85f9-0baf99d0ac6b';

-- Обновляем lessons_count для Unit 2 (фактически есть 3 урока: 8, 9, 10)
UPDATE course_units 
SET lessons_count = 3 
WHERE id = 'ddc8c9ca-5a95-4edf-abb1-d3bb1ba4c499';

-- Исправляем нумерацию уроков в Unit 2: меняем уроки 8,9,10 на 1,2,3
UPDATE unit_lessons 
SET lesson_number = 1, sort_order = 1
WHERE id = '40fa3276-29e5-4d38-b353-c1f414ddfb0b' AND lesson_number = 8;

UPDATE unit_lessons 
SET lesson_number = 2, sort_order = 2
WHERE id = 'c12b97c5-69bf-4706-9bbe-5eb130b29dde' AND lesson_number = 9;

UPDATE unit_lessons 
SET lesson_number = 3, sort_order = 3
WHERE id = '37414115-d7bd-457f-9a89-def3ecd712e7' AND lesson_number = 10;