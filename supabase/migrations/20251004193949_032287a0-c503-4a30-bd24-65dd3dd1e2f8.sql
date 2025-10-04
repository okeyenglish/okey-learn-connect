-- Добавляем колонки для человекочитаемых ID
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS student_number TEXT UNIQUE;

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS client_number TEXT UNIQUE;

ALTER TABLE public.learning_groups 
ADD COLUMN IF NOT EXISTS group_number TEXT UNIQUE;

ALTER TABLE public.individual_lessons 
ADD COLUMN IF NOT EXISTS lesson_number TEXT UNIQUE;

-- Создаем последовательности для генерации номеров
CREATE SEQUENCE IF NOT EXISTS students_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS clients_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS groups_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS lessons_number_seq START 1;

-- Функция для генерации номера студента
CREATE OR REPLACE FUNCTION public.generate_student_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_number IS NULL THEN
    NEW.student_number := 'S' || LPAD(nextval('students_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Функция для генерации номера клиента
CREATE OR REPLACE FUNCTION public.generate_client_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_number IS NULL THEN
    NEW.client_number := 'C' || LPAD(nextval('clients_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Функция для генерации номера группы
CREATE OR REPLACE FUNCTION public.generate_group_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.group_number IS NULL THEN
    NEW.group_number := 'G' || LPAD(nextval('groups_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Функция для генерации номера индивидуального занятия
CREATE OR REPLACE FUNCTION public.generate_lesson_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lesson_number IS NULL THEN
    NEW.lesson_number := 'L' || LPAD(nextval('lessons_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Создаем триггеры для автоматической генерации номеров
DROP TRIGGER IF EXISTS set_student_number ON public.students;
CREATE TRIGGER set_student_number
  BEFORE INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_student_number();

DROP TRIGGER IF EXISTS set_client_number ON public.clients;
CREATE TRIGGER set_client_number
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_client_number();

DROP TRIGGER IF EXISTS set_group_number ON public.learning_groups;
CREATE TRIGGER set_group_number
  BEFORE INSERT ON public.learning_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_group_number();

DROP TRIGGER IF EXISTS set_lesson_number ON public.individual_lessons;
CREATE TRIGGER set_lesson_number
  BEFORE INSERT ON public.individual_lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_lesson_number();

-- Обновляем существующие записи студентов
DO $$
DECLARE
  student_record RECORD;
  counter INTEGER := 1;
BEGIN
  FOR student_record IN 
    SELECT id FROM public.students 
    WHERE student_number IS NULL 
    ORDER BY created_at
  LOOP
    UPDATE public.students 
    SET student_number = 'S' || LPAD(counter::TEXT, 5, '0')
    WHERE id = student_record.id;
    counter := counter + 1;
  END LOOP;
  
  -- Устанавливаем последовательность на следующее значение
  PERFORM setval('students_number_seq', counter);
END $$;

-- Обновляем существующие записи клиентов
DO $$
DECLARE
  client_record RECORD;
  counter INTEGER := 1;
BEGIN
  FOR client_record IN 
    SELECT id FROM public.clients 
    WHERE client_number IS NULL 
    ORDER BY created_at
  LOOP
    UPDATE public.clients 
    SET client_number = 'C' || LPAD(counter::TEXT, 5, '0')
    WHERE id = client_record.id;
    counter := counter + 1;
  END LOOP;
  
  PERFORM setval('clients_number_seq', counter);
END $$;

-- Обновляем существующие записи групп
DO $$
DECLARE
  group_record RECORD;
  counter INTEGER := 1;
BEGIN
  FOR group_record IN 
    SELECT id FROM public.learning_groups 
    WHERE group_number IS NULL 
    ORDER BY created_at
  LOOP
    UPDATE public.learning_groups 
    SET group_number = 'G' || LPAD(counter::TEXT, 5, '0')
    WHERE id = group_record.id;
    counter := counter + 1;
  END LOOP;
  
  PERFORM setval('groups_number_seq', counter);
END $$;

-- Обновляем существующие записи индивидуальных занятий
DO $$
DECLARE
  lesson_record RECORD;
  counter INTEGER := 1;
BEGIN
  FOR lesson_record IN 
    SELECT id FROM public.individual_lessons 
    WHERE lesson_number IS NULL 
    ORDER BY created_at
  LOOP
    UPDATE public.individual_lessons 
    SET lesson_number = 'L' || LPAD(counter::TEXT, 5, '0')
    WHERE id = lesson_record.id;
    counter := counter + 1;
  END LOOP;
  
  PERFORM setval('lessons_number_seq', counter);
END $$;

-- Индексы для быстрого поиска по номерам
CREATE INDEX IF NOT EXISTS idx_students_number ON public.students(student_number);
CREATE INDEX IF NOT EXISTS idx_clients_number ON public.clients(client_number);
CREATE INDEX IF NOT EXISTS idx_groups_number ON public.learning_groups(group_number);
CREATE INDEX IF NOT EXISTS idx_lessons_number ON public.individual_lessons(lesson_number);

-- Комментарии для документации
COMMENT ON COLUMN public.students.student_number IS 'Уникальный человекочитаемый номер студента (формат: S00001)';
COMMENT ON COLUMN public.clients.client_number IS 'Уникальный человекочитаемый номер клиента (формат: C00001)';
COMMENT ON COLUMN public.learning_groups.group_number IS 'Уникальный человекочитаемый номер группы (формат: G00001)';
COMMENT ON COLUMN public.individual_lessons.lesson_number IS 'Уникальный человекочитаемый номер индивидуального занятия (формат: L00001)';