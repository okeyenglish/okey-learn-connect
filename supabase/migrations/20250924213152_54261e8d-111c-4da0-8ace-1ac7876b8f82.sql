-- Add missing Units 3 and 4 to Kids Box 1 course
WITH course_data AS (
  SELECT id FROM courses WHERE slug = 'kids-box-1' LIMIT 1
)
INSERT INTO course_units (course_id, unit_number, title, description, vocabulary, grammar, lessons_count, sort_order)
SELECT 
  course_data.id,
  3,
  'Unit 3 — Favourite toys',
  'Изучаем игрушки, их описание и выражение предпочтений',
  'toys vocabulary: ball, doll, car, teddy bear, bike, train; possessive adjectives; colours',
  'possessive adjectives (my/your/his/her); This is/That is; colour adjectives',
  7,
  3
FROM course_data
UNION ALL
SELECT 
  course_data.id,
  4,
  'Unit 4 — In the park',
  'Парк, животные и действия на природе',
  'park activities: running, playing, jumping, climbing; animals: duck, bird, cat, dog; action verbs',
  'Present Continuous (be + -ing); prepositions: in, on, under; action verbs',
  7,
  4
FROM course_data;