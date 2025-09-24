-- Add a sample audio file to the textbooks table
INSERT INTO textbooks (
  title,
  description,
  file_name,
  file_url,
  program_type,
  category,
  sort_order
) VALUES (
  'Kids Box 1 - Audio Track Sample',
  'Пример аудио дорожки для программы Kids Box 1',
  'kids-box-1-audio-sample.mp3',
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
  'kids-box-1',
  'audio',
  3
) ON CONFLICT DO NOTHING;