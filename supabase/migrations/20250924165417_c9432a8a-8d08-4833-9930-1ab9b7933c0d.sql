-- Add some example audio files with subcategories for Kids Box 1
INSERT INTO textbooks (
  title,
  description,
  file_name,
  file_url,
  program_type,
  category,
  subcategory,
  sort_order
) VALUES 
(
  'Kids Box 1 Unit 1 - Hello Track 1',
  'Приветствие и знакомство',
  'kids-box-1-unit-1-track-1.mp3',
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
  'kids-box-1',
  'audio',
  'unit-1',
  10
),
(
  'Kids Box 1 Unit 1 - Hello Track 2',
  'Песня Hello Song',
  'kids-box-1-unit-1-track-2.mp3', 
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
  'kids-box-1',
  'audio',
  'unit-1',
  11
),
(
  'Kids Box 1 Unit 2 - My School Track 1',
  'Школьные предметы',
  'kids-box-1-unit-2-track-1.mp3',
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
  'kids-box-1',
  'audio',
  'unit-2',
  20
),
(
  'Grammar Song - Present Simple',
  'Песня про настоящее простое время',
  'grammar-present-simple.mp3',
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
  'kids-box-1',
  'audio',
  'grammar-songs',
  100
) ON CONFLICT DO NOTHING;