-- Add Units 5-12 to existing Kids Box 1 course
WITH course_data AS (
  SELECT id FROM courses WHERE slug = 'kids-box-1' LIMIT 1
)
INSERT INTO course_units (course_id, unit_number, title, description, vocabulary, grammar, lessons_count, sort_order)
SELECT 
  course_data.id,
  5,
  'Our pet',
  'Изучаем домашних питомцев, их описание и уход за ними. Урок 29 (2025-12-08) — Pets vocabulary; adjectives. Урок 30 (2025-12-11) — Have got/has got (описание питомцев). Урок 31 (2025-12-15) — Pet food & care. Урок 32 (2025-12-18) — Story: Pet adventure. Урок 33 (2025-12-22) — Revision & creative project. Урок 34 (2025-12-25) — Assessment Unit 5. Урок 35 (2025-12-29) — Special: Christmas lesson.',
  'pets vocabulary: dog, cat, rabbit, hamster, fish, bird; adjectives: big, small, furry, cute; pet food and care',
  'have got/has got (описание питомцев); вопросы с have got',
  7,
  5
FROM course_data
UNION ALL
SELECT 
  course_data.id,
  6,
  'My face',
  'Изучаем части лица, описания внешности и чувства. Урок 36 (2026-01-12) — Parts of the face; senses. Урок 37 (2026-01-15) — Adjectives; describing people. Урок 38 (2026-01-19) — Have got (features). Урок 39 (2026-01-22) — Story: Face painting. Урок 40 (2026-01-26) — Revision & craft. Урок 41 (2026-01-29) — Assessment Unit 6.',
  'parts of the face: eyes, nose, mouth, ears, hair; adjectives: long, short, curly, straight; senses',
  'have got (features); описательные прилагательные',
  6,
  6
FROM course_data
UNION ALL
SELECT 
  course_data.id,
  7,
  'Wild animals',
  'Знакомимся с дикими животными, их способностями и местами обитания. Урок 42 (2026-02-02) — Zoo animals vocabulary. Урок 43 (2026-02-05) — Animal body parts; adjectives. Урок 44 (2026-02-09) — Can/Cannot (abilities). Урок 45 (2026-02-12) — Habitats; there is/are. Урок 46 (2026-02-16) — Story: Animal adventure. Урок 47 (2026-02-19) — Revision & craft. Урок 48 (2026-02-23) — Assessment Unit 7.',
  'zoo animals: elephant, lion, monkey, giraffe, tiger, bear; animal body parts; habitats: jungle, desert, sea',
  'can/cannot (abilities); there is/are (basic); описания животных',
  7,
  7
FROM course_data
UNION ALL
SELECT 
  course_data.id,
  8,
  'My clothes',
  'Изучаем одежду, цвета и их сочетания с погодой. Урок 49 (2026-02-26) — Clothes + colours. Урок 50 (2026-03-02) — Like/Do not like (clothes). Урок 51 (2026-03-05) — Weather & seasons. Урок 52 (2026-03-09) — Story: Lost clothes. Урок 53 (2026-03-12) — Revision & fashion show. Урок 54 (2026-03-16) — Assessment Unit 8.',
  'clothes: shirt, trousers, dress, shoes, hat, coat; colours; weather and seasons',
  'like/do not like (clothes); I am wearing...; погода и одежда',
  6,
  8
FROM course_data
UNION ALL
SELECT 
  course_data.id,
  9,
  'Fun time!',
  'Развлечения, хобби и свободное время. Урок 55 (2026-03-19) — Hobbies & free time. Урок 56 (2026-03-23) — Present Continuous (I am ...ing) — ввод. Урок 57 (2026-03-26) — Adverbs of frequency (basic). Урок 58 (2026-03-30) — Story: Fun day. Урок 59 (2026-04-02) — Revision & role-play. Урок 60 (2026-04-06) — Assessment Unit 9.',
  'hobbies: swimming, reading, drawing, playing; free time activities; frequency adverbs',
  'Present Continuous (I am ...ing) - ввод; adverbs of frequency (basic)',
  6,
  9
FROM course_data
UNION ALL
SELECT 
  course_data.id,
  10,
  'At the funfair',
  'Парк развлечений, аттракционы и эмоции. Урок 61 (2026-04-09) — Funfair rides & attractions. Урок 62 (2026-04-13) — Prepositions of movement. Урок 63 (2026-04-16) — Adjectives of feelings. Урок 64 (2026-04-20) — Story: Funfair adventure. Урок 65 (2026-04-23) — Project: Design a funfair. Урок 66 (2026-04-27) — Revision & board game. Урок 67 (2026-04-30) — Assessment Unit 10.',
  'funfair rides: carousel, ferris wheel, roller coaster; attractions; feelings adjectives',
  'prepositions of movement; adjectives of feelings; Let us go to...',
  7,
  10
FROM course_data
UNION ALL
SELECT 
  course_data.id,
  11,
  'Our house',
  'Дом, комнаты, мебель и предметы интерьера. Урок 68 (2026-05-04) — Rooms of the house; there is/are. Урок 69 (2026-05-07) — Furniture & objects. Урок 70 (2026-05-11) — Prepositions of place. Урок 71 (2026-05-14) — Story: House party. Урок 72 (2026-05-18) — Project: Dream house model. Урок 73 (2026-05-21) — Revision & games. Урок 74 (2026-05-25) — Assessment Unit 11.',
  'rooms: kitchen, bedroom, living room, bathroom; furniture: table, chair, bed, sofa; objects',
  'there is/are (развитие); prepositions of place (review + house)',
  7,
  11
FROM course_data
UNION ALL
SELECT 
  course_data.id,
  12,
  'Party time!',
  'Праздники, приглашения и вежливые просьбы. Урок 75 (2026-05-28) — Party vocabulary; invitations. Урок 76 (2026-06-01) — Days of the week; ordinal numbers. Урок 77 (2026-06-04) — Polite requests & offers. Урок 78 (2026-06-08) — Story: Birthday surprise. Урок 79 (2026-06-11) — Revision & party preparation. Урок 80 (2026-06-15) — Assessment & final celebration.',
  'party vocabulary: cake, balloons, presents, games; days of the week; ordinal numbers',
  'polite requests & offers; Would you like...?; Can I...? Please...',
  6,
  12
FROM course_data;