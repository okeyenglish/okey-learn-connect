-- Добавляем недостающие колонки в таблицу unit_lessons
ALTER TABLE unit_lessons 
ADD COLUMN goals TEXT,
ADD COLUMN structure TEXT,
ADD COLUMN homework TEXT;

-- Сначала удаляем существующие уроки
DELETE FROM unit_lessons WHERE unit_id IN (
    SELECT cu.id FROM course_units cu 
    JOIN courses c ON c.id = cu.course_id 
    WHERE c.slug = 'kids-box-1'
);

-- Обновляем названия юнитов и количество уроков в соответствии с новой структурой
UPDATE course_units 
SET title = 'Unit 1 — Hello!', lessons_count = 7 
WHERE id = '3900f5c9-b358-43e7-85f9-0baf99d0ac6b';

UPDATE course_units 
SET title = 'Unit 2 — My school', lessons_count = 7 
WHERE id = 'ddc8c9ca-5a95-4edf-abb1-d3bb1ba4c499';

UPDATE course_units 
SET title = 'Unit 3 — Favourite toys', lessons_count = 7 
WHERE id = '5cf12c2e-ef06-4a0e-baf9-b2034e0f6d11';

UPDATE course_units 
SET title = 'Unit 4 — My family (+ спецурок Halloween)', lessons_count = 7 
WHERE id = 'ffa8d804-3e22-44d1-b2fd-f08ff2741c21';

UPDATE course_units 
SET title = 'Unit 5 — Our pet (+ спецурок Christmas)', lessons_count = 7 
WHERE id = 'd5ad4836-678a-439b-bc99-d673ab3f1801';

UPDATE course_units 
SET title = 'Unit 6 — My face', lessons_count = 6 
WHERE id = '32e787dd-44f0-441b-ac03-e8fdc050690c';

UPDATE course_units 
SET title = 'Unit 7 — Wild animals', lessons_count = 7 
WHERE id = '515d42e6-fce5-44f5-b468-d504765ae8dc';

UPDATE course_units 
SET title = 'Unit 8 — My clothes', lessons_count = 6 
WHERE id = 'a799ecfc-87bb-4beb-8445-0cf4b58fa56c';

UPDATE course_units 
SET title = 'Unit 9 — Fun time!', lessons_count = 6 
WHERE id = '97bacb7f-3ef3-4562-8e57-4395f992c776';

UPDATE course_units 
SET title = 'Unit 10 — At the funfair', lessons_count = 7 
WHERE id = '5481d67d-8aae-4d8c-85d2-5c17c476a3e3';

UPDATE course_units 
SET title = 'Unit 11 — Our house', lessons_count = 7 
WHERE id = '9d876c85-060f-445a-8dbb-d3a3b9f1d6bf';

UPDATE course_units 
SET title = 'Unit 12 — Party time!', lessons_count = 6 
WHERE id = 'f1424ad8-60d5-4fc9-a7d3-e211a9841b40';