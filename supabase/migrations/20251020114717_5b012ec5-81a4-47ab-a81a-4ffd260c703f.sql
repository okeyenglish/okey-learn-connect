-- Добавляем поле для хранения BBB meeting ID в таблицы занятий
ALTER TABLE lesson_sessions 
ADD COLUMN IF NOT EXISTS bbb_meeting_id TEXT,
ADD COLUMN IF NOT EXISTS bbb_meeting_url TEXT;

ALTER TABLE individual_lesson_sessions 
ADD COLUMN IF NOT EXISTS bbb_meeting_id TEXT,
ADD COLUMN IF NOT EXISTS bbb_meeting_url TEXT;

-- Создаем функцию для автоматического создания BBB meeting ID
CREATE OR REPLACE FUNCTION generate_bbb_meeting_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bbb_meeting_id IS NULL THEN
    IF TG_TABLE_NAME = 'lesson_sessions' AND NEW.group_id IS NOT NULL THEN
      NEW.bbb_meeting_id := 'group_' || NEW.group_id::text || '_' || NEW.lesson_date::text || '_' || NEW.start_time::text;
    ELSIF TG_TABLE_NAME = 'individual_lesson_sessions' AND NEW.individual_lesson_id IS NOT NULL THEN
      NEW.bbb_meeting_id := 'individual_' || NEW.individual_lesson_id::text || '_' || NEW.lesson_date::text;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггеры для автоматической генерации meeting ID
DROP TRIGGER IF EXISTS generate_bbb_meeting_id_trigger ON lesson_sessions;
CREATE TRIGGER generate_bbb_meeting_id_trigger
BEFORE INSERT ON lesson_sessions
FOR EACH ROW
EXECUTE FUNCTION generate_bbb_meeting_id();

DROP TRIGGER IF EXISTS generate_bbb_meeting_id_trigger ON individual_lesson_sessions;
CREATE TRIGGER generate_bbb_meeting_id_trigger
BEFORE INSERT ON individual_lesson_sessions
FOR EACH ROW
EXECUTE FUNCTION generate_bbb_meeting_id();

-- Обновляем существующие записи с meeting ID
UPDATE lesson_sessions 
SET bbb_meeting_id = 'group_' || group_id::text || '_' || lesson_date::text || '_' || start_time::text
WHERE bbb_meeting_id IS NULL AND group_id IS NOT NULL;

UPDATE individual_lesson_sessions 
SET bbb_meeting_id = 'individual_' || individual_lesson_id::text || '_' || lesson_date::text
WHERE bbb_meeting_id IS NULL AND individual_lesson_id IS NOT NULL;