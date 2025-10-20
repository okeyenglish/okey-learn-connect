-- Создаем таблицу для BBB комнат преподавателей
CREATE TABLE IF NOT EXISTS teacher_bbb_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  meeting_id TEXT NOT NULL UNIQUE,
  meeting_url TEXT NOT NULL,
  moderator_password TEXT NOT NULL DEFAULT 'teacher',
  attendee_password TEXT NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Включаем RLS
ALTER TABLE teacher_bbb_rooms ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Authenticated users can view teacher BBB rooms"
ON teacher_bbb_rooms FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and managers can manage teacher BBB rooms"
ON teacher_bbb_rooms FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Создаем уникальный индекс
CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_bbb_rooms_teacher_name 
ON teacher_bbb_rooms(teacher_name);

-- Удаляем старые поля из lesson_sessions и individual_lesson_sessions
ALTER TABLE lesson_sessions 
DROP COLUMN IF EXISTS bbb_meeting_id,
DROP COLUMN IF EXISTS bbb_meeting_url;

ALTER TABLE individual_lesson_sessions 
DROP COLUMN IF EXISTS bbb_meeting_id,
DROP COLUMN IF EXISTS bbb_meeting_url;

-- Удаляем старые триггеры
DROP TRIGGER IF EXISTS generate_bbb_meeting_id_trigger ON lesson_sessions;
DROP TRIGGER IF EXISTS generate_bbb_meeting_id_trigger ON individual_lesson_sessions;
DROP FUNCTION IF EXISTS generate_bbb_meeting_id();

-- Создаем функцию для автоматического создания BBB комнат для новых преподавателей
CREATE OR REPLACE FUNCTION create_teacher_bbb_room()
RETURNS TRIGGER AS $$
DECLARE
  room_meeting_id TEXT;
BEGIN
  -- Генерируем уникальный meeting_id для преподавателя
  room_meeting_id := 'teacher_' || NEW.id::text;
  
  -- Создаем запись комнаты для нового преподавателя
  INSERT INTO teacher_bbb_rooms (
    teacher_id,
    teacher_name,
    meeting_id,
    meeting_url,
    moderator_password,
    attendee_password
  ) VALUES (
    NEW.id,
    NEW.last_name || ' ' || NEW.first_name,
    room_meeting_id,
    'https://calls.okey-english.ru/bigbluebutton/',
    'teacher',
    'student'
  )
  ON CONFLICT (teacher_name) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Создаем триггер для автоматического создания комнат
CREATE TRIGGER create_teacher_bbb_room_trigger
AFTER INSERT ON teachers
FOR EACH ROW
EXECUTE FUNCTION create_teacher_bbb_room();

-- Создаем комнаты для всех существующих активных преподавателей
INSERT INTO teacher_bbb_rooms (
  teacher_id,
  teacher_name,
  meeting_id,
  meeting_url,
  moderator_password,
  attendee_password
)
SELECT 
  id,
  last_name || ' ' || first_name,
  'teacher_' || id::text,
  'https://calls.okey-english.ru/bigbluebutton/',
  'teacher',
  'student'
FROM teachers
WHERE is_active = true
ON CONFLICT (teacher_name) DO NOTHING;