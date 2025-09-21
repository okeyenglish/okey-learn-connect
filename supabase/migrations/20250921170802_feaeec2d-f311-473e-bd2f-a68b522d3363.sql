-- Create individual_lessons table
CREATE TABLE public.individual_lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name text NOT NULL,
  student_id uuid,
  branch text NOT NULL DEFAULT 'Окская',
  subject text NOT NULL DEFAULT 'Английский',
  level text NOT NULL,
  category group_category NOT NULL DEFAULT 'all',
  lesson_type text NOT NULL DEFAULT 'individual',
  status group_status NOT NULL DEFAULT 'active',
  academic_hours numeric DEFAULT 0,
  debt_hours numeric DEFAULT 0,
  teacher_name text,
  schedule_days text[], -- Array of days like ['пн', 'ср']
  schedule_time text, -- Time like '18:00-19:20'
  lesson_location text, -- 'office' or 'skype' or 'home'
  is_skype_only boolean DEFAULT false,
  period_start date,
  period_end date,
  lesson_start_month text,
  lesson_end_month text,
  price_per_lesson numeric,
  audit_location text, -- Audit location like 'LAS VEGAS', 'CAMBRIDGE'
  description text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_individual_lessons_branch ON public.individual_lessons(branch);
CREATE INDEX idx_individual_lessons_status ON public.individual_lessons(status);
CREATE INDEX idx_individual_lessons_subject ON public.individual_lessons(subject);
CREATE INDEX idx_individual_lessons_level ON public.individual_lessons(level);
CREATE INDEX idx_individual_lessons_teacher ON public.individual_lessons(teacher_name);
CREATE INDEX idx_individual_lessons_student_name ON public.individual_lessons(student_name);

-- Enable Row Level Security
ALTER TABLE public.individual_lessons ENABLE ROW LEVEL SECURITY;

-- Create policies for individual_lessons (same as learning_groups)
CREATE POLICY "Users can view individual lessons from their branches" 
ON public.individual_lessons 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND (
      individual_lessons.branch = p.branch 
      OR EXISTS (
        SELECT 1 FROM manager_branches mb 
        WHERE mb.manager_id = auth.uid() 
        AND mb.branch = individual_lessons.branch
      )
    )
  )
);

CREATE POLICY "Users can insert individual lessons to their branches" 
ON public.individual_lessons 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND (
      individual_lessons.branch = p.branch 
      OR EXISTS (
        SELECT 1 FROM manager_branches mb 
        WHERE mb.manager_id = auth.uid() 
        AND mb.branch = individual_lessons.branch
      )
    )
  )
);

CREATE POLICY "Users can update individual lessons from their branches" 
ON public.individual_lessons 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND (
      individual_lessons.branch = p.branch 
      OR EXISTS (
        SELECT 1 FROM manager_branches mb 
        WHERE mb.manager_id = auth.uid() 
        AND mb.branch = individual_lessons.branch
      )
    )
  )
);

CREATE POLICY "Users can delete individual lessons from their branches" 
ON public.individual_lessons 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND (
      individual_lessons.branch = p.branch 
      OR EXISTS (
        SELECT 1 FROM manager_branches mb 
        WHERE mb.manager_id = auth.uid() 
        AND mb.branch = individual_lessons.branch
      )
    )
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_individual_lessons_updated_at
BEFORE UPDATE ON public.individual_lessons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data for individual lessons
INSERT INTO public.individual_lessons (
  student_name, branch, subject, level, category, academic_hours, 
  debt_hours, teacher_name, schedule_days, schedule_time, 
  lesson_location, audit_location, price_per_lesson
) VALUES 
('Агафонов А. А.', 'Окская', 'Английский', 'Prepare 3', 'school', 39, 0, 
 'Рафиков Денис Андреевич', ARRAY['чт'], '19:10-19:50', 'office', 'LAS VEGAS', 1200),
('Агафонов А. А.', 'Окская', 'Немецкий', 'Немецкий', 'school', 37, 0, 
 'Подобедов Александр Юрьевич', ARRAY['чт'], '20:00-20:40', 'office', 'CAMBRIDGE', 1300),
('Азизов Ф.', 'Некрасовка', 'Английский', 'Empower 1', 'adult', 727, 0, 
 '[Нет]', ARRAY['вт', 'пт'], '17:00-17:40', 'home', 'На территории ученика', 1500),
('Алавердян М.', 'Солнцево', 'Французский', 'Focus 4', 'school', 0, 0, 
 'Паттерсон Сита', ARRAY['вт'], '16:00-16:40', 'office', 'На территории ученика', 1400),
('Алямкин Ф.', 'Грайвороновская', 'Английский', 'Школьная программа', 'school', 67, 0, 
 'Эвижер Валерия, Папонова Анастасия', ARRAY['пн', 'ср'], '15:00-15:40', 'office', 'Cambridge', 1100);