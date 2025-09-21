-- Create enum types for group management
CREATE TYPE group_status AS ENUM ('reserve', 'forming', 'active', 'suspended', 'finished');
CREATE TYPE group_type AS ENUM ('general', 'individual', 'mini', 'corporate');
CREATE TYPE payment_method AS ENUM ('per_lesson', 'monthly', 'course', 'package');
CREATE TYPE group_category AS ENUM ('preschool', 'school', 'adult', 'all');

-- Create learning_groups table
CREATE TABLE public.learning_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  custom_name text,
  branch text NOT NULL DEFAULT 'Окская',
  subject text NOT NULL DEFAULT 'Английский',
  level text NOT NULL,
  category group_category NOT NULL DEFAULT 'all',
  group_type group_type NOT NULL DEFAULT 'general',
  status group_status NOT NULL DEFAULT 'forming',
  payment_method payment_method NOT NULL DEFAULT 'per_lesson',
  default_price numeric,
  textbook text,
  responsible_teacher text,
  capacity integer NOT NULL DEFAULT 12,
  current_students integer NOT NULL DEFAULT 0,
  academic_hours numeric DEFAULT 0,
  schedule_days text[], -- Array of days like ['пн', 'ср']
  schedule_time text, -- Time like '18:00-19:20'
  schedule_room text,
  period_start date,
  period_end date,
  lesson_start_time time,
  lesson_end_time time,
  lesson_start_month text,
  lesson_end_month text,
  debt_count integer DEFAULT 0,
  zoom_link text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_learning_groups_branch ON public.learning_groups(branch);
CREATE INDEX idx_learning_groups_status ON public.learning_groups(status);
CREATE INDEX idx_learning_groups_subject ON public.learning_groups(subject);
CREATE INDEX idx_learning_groups_level ON public.learning_groups(level);
CREATE INDEX idx_learning_groups_category ON public.learning_groups(category);
CREATE INDEX idx_learning_groups_responsible ON public.learning_groups(responsible_teacher);

-- Enable Row Level Security
ALTER TABLE public.learning_groups ENABLE ROW LEVEL SECURITY;

-- Create policies for learning_groups
CREATE POLICY "Users can view groups from their branches" 
ON public.learning_groups 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND (
      learning_groups.branch = p.branch 
      OR EXISTS (
        SELECT 1 FROM manager_branches mb 
        WHERE mb.manager_id = auth.uid() 
        AND mb.branch = learning_groups.branch
      )
    )
  )
);

CREATE POLICY "Users can insert groups to their branches" 
ON public.learning_groups 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND (
      learning_groups.branch = p.branch 
      OR EXISTS (
        SELECT 1 FROM manager_branches mb 
        WHERE mb.manager_id = auth.uid() 
        AND mb.branch = learning_groups.branch
      )
    )
  )
);

CREATE POLICY "Users can update groups from their branches" 
ON public.learning_groups 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND (
      learning_groups.branch = p.branch 
      OR EXISTS (
        SELECT 1 FROM manager_branches mb 
        WHERE mb.manager_id = auth.uid() 
        AND mb.branch = learning_groups.branch
      )
    )
  )
);

CREATE POLICY "Users can delete groups from their branches" 
ON public.learning_groups 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND (
      learning_groups.branch = p.branch 
      OR EXISTS (
        SELECT 1 FROM manager_branches mb 
        WHERE mb.manager_id = auth.uid() 
        AND mb.branch = learning_groups.branch
      )
    )
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_learning_groups_updated_at
BEFORE UPDATE ON public.learning_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data
INSERT INTO public.learning_groups (
  name, branch, subject, level, category, group_type, status, 
  capacity, academic_hours, schedule_days, schedule_time, 
  schedule_room, responsible_teacher, textbook, default_price
) VALUES 
('VE4', 'Котельники', 'Английский', 'Empower 4', 'adult', 'general', 'active', 
 12, 103.5, ARRAY['ср', 'пт'], '20:00-21:00', 'Аудитория 1', 'Tchuente Dany', 'New York', 15000),
('ГР1_SS2', 'Котельники', 'Английский', 'Super Safari 2', 'preschool', 'general', 'active', 
 8, 117, ARRAY['вт', 'чт'], '18:40-19:40', 'Аудитория 2', 'Martin Gonzaga', 'Disney', 12000),
('ГР2_SS3', 'Котельники', 'Английский', 'Super Safari 3', 'preschool', 'general', 'active', 
 6, 117, ARRAY['пн', 'ср'], '18:40-19:40', 'Аудитория 3', 'Папонова Анастасия', 'Disney', 12000),
('ГР10_KB3+4', 'Котельники', 'Английский', 'Kids Box 3+4', 'school', 'general', 'active', 
 10, 156, ARRAY['вт', 'чт'], '16:00-17:20', 'Аудитория 1', 'Папонова Анастасия', 'Cambridge', 14000),
('ГР30_PR2', 'Котельники', 'Английский', 'Prepare 2', 'school', 'general', 'active', 
 8, 156, ARRAY['пн', 'ср'], '17:20-18:40', 'Аудитория 2', 'Эвижер Валерия', 'New York', 16000);