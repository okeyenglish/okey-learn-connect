-- Добавляем поля для автоматического планирования курса в learning_groups
ALTER TABLE learning_groups 
ADD COLUMN course_id uuid REFERENCES courses(id),
ADD COLUMN course_start_date date,
ADD COLUMN lessons_generated boolean DEFAULT false,
ADD COLUMN total_lessons integer DEFAULT 80;

-- Добавляем связь урока с номером занятия в курсе
ALTER TABLE lesson_sessions 
ADD COLUMN lesson_number integer,
ADD COLUMN course_lesson_id uuid REFERENCES lessons(id);

-- Создаем функцию для автоматической генерации расписания курса
CREATE OR REPLACE FUNCTION generate_course_schedule(
  p_group_id uuid,
  p_course_id uuid,
  p_start_date date,
  p_schedule_days text[],
  p_start_time time,
  p_end_time time,
  p_teacher_name text,
  p_classroom text,
  p_branch text,
  p_total_lessons integer DEFAULT 80
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lesson_date date := p_start_date;
  lesson_count integer := 0;
  current_day text;
  lesson_rec record;
BEGIN
  -- Удаляем существующие занятия группы если они есть
  DELETE FROM lesson_sessions WHERE group_id = p_group_id;
  
  WHILE lesson_count < p_total_lessons LOOP
    -- Получаем день недели (0=воскресенье, 1=понедельник и т.д.)
    SELECT CASE 
      WHEN EXTRACT(DOW FROM lesson_date) = 0 THEN 'sunday'
      WHEN EXTRACT(DOW FROM lesson_date) = 1 THEN 'monday'
      WHEN EXTRACT(DOW FROM lesson_date) = 2 THEN 'tuesday'
      WHEN EXTRACT(DOW FROM lesson_date) = 3 THEN 'wednesday'
      WHEN EXTRACT(DOW FROM lesson_date) = 4 THEN 'thursday'
      WHEN EXTRACT(DOW FROM lesson_date) = 5 THEN 'friday'
      WHEN EXTRACT(DOW FROM lesson_date) = 6 THEN 'saturday'
    END INTO current_day;
    
    -- Проверяем, входит ли этот день в расписание группы
    IF current_day = ANY(p_schedule_days) THEN
      lesson_count := lesson_count + 1;
      
      -- Получаем соответствующий урок из курса
      SELECT l.id, l.lesson_number, l.title INTO lesson_rec
      FROM lessons l 
      JOIN course_units cu ON cu.id = l.unit_id 
      WHERE cu.course_id = p_course_id 
      ORDER BY cu.unit_number, l.lesson_number
      LIMIT 1 OFFSET (lesson_count - 1);
      
      -- Создаем занятие
      INSERT INTO lesson_sessions (
        group_id,
        lesson_date,
        start_time,
        end_time,
        teacher_name,
        classroom,
        branch,
        day_of_week,
        lesson_number,
        course_lesson_id,
        status,
        notes
      ) VALUES (
        p_group_id,
        lesson_date,
        p_start_time,
        p_end_time,
        p_teacher_name,
        p_classroom,
        p_branch,
        current_day::day_of_week,
        lesson_count,
        lesson_rec.id,
        'scheduled',
        CASE 
          WHEN lesson_rec.title IS NOT NULL 
          THEN 'Урок ' || lesson_count || ': ' || lesson_rec.title
          ELSE 'Урок ' || lesson_count
        END
      );
    END IF;
    
    -- Переходим к следующему дню
    lesson_date := lesson_date + INTERVAL '1 day';
  END LOOP;
  
  -- Обновляем статус группы
  UPDATE learning_groups 
  SET 
    lessons_generated = true,
    course_id = p_course_id,
    course_start_date = p_start_date,
    total_lessons = p_total_lessons
  WHERE id = p_group_id;
END;
$$;