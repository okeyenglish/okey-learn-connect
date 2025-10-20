-- Создаем преподавателя Даниил Пышнов
INSERT INTO public.teachers (first_name, last_name, subjects, is_active, branch)
VALUES ('Даниил', 'Пышнов', ARRAY['Английский'], true, 'Окская')
ON CONFLICT DO NOTHING;

-- Создаем BBB комнату для Даниила Пышнова
INSERT INTO public.teacher_bbb_rooms (
  teacher_name,
  meeting_id,
  meeting_url,
  moderator_password,
  attendee_password,
  is_active
)
SELECT 
  'Пышнов Даниил',
  'teacher_pyshnov_daniil',
  'https://calls.okey-english.ru/bigbluebutton/',
  'teacher',
  'student',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.teacher_bbb_rooms 
  WHERE teacher_name = 'Пышнов Даниил'
);