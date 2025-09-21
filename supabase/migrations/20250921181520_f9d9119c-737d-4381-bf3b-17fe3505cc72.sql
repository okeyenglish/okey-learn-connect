-- Create teachers table
CREATE TABLE public.teachers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  subjects TEXT[] DEFAULT '{}', -- Array of subjects they teach
  categories TEXT[] DEFAULT '{}', -- Array of age categories they work with
  branch TEXT NOT NULL DEFAULT 'Окская',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Create policies for teachers
CREATE POLICY "Users can view teachers from their branches" 
ON public.teachers 
FOR SELECT 
USING (EXISTS (
  SELECT 1 
  FROM profiles p 
  WHERE p.id = auth.uid() 
  AND (teachers.branch = p.branch OR EXISTS (
    SELECT 1 
    FROM manager_branches mb 
    WHERE mb.manager_id = auth.uid() 
    AND mb.branch = teachers.branch
  ))
));

CREATE POLICY "Users can insert teachers to their branches" 
ON public.teachers 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 
  FROM profiles p 
  WHERE p.id = auth.uid() 
  AND (teachers.branch = p.branch OR EXISTS (
    SELECT 1 
    FROM manager_branches mb 
    WHERE mb.manager_id = auth.uid() 
    AND mb.branch = teachers.branch
  ))
));

CREATE POLICY "Users can update teachers from their branches" 
ON public.teachers 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 
  FROM profiles p 
  WHERE p.id = auth.uid() 
  AND (teachers.branch = p.branch OR EXISTS (
    SELECT 1 
    FROM manager_branches mb 
    WHERE mb.manager_id = auth.uid() 
    AND mb.branch = teachers.branch
  ))
));

CREATE POLICY "Users can delete teachers from their branches" 
ON public.teachers 
FOR DELETE 
USING (EXISTS (
  SELECT 1 
  FROM profiles p 
  WHERE p.id = auth.uid() 
  AND (teachers.branch = p.branch OR EXISTS (
    SELECT 1 
    FROM manager_branches mb 
    WHERE mb.manager_id = auth.uid() 
    AND mb.branch = teachers.branch
  ))
));

-- Add trigger for updated_at
CREATE TRIGGER update_teachers_updated_at
BEFORE UPDATE ON public.teachers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample teachers
INSERT INTO public.teachers (first_name, last_name, subjects, categories, branch) VALUES
('Анна', 'Иванова', '{"Английский"}', '{"preschool", "school"}', 'Окская'),
('Мария', 'Петрова', '{"Английский"}', '{"school", "adult"}', 'Окская'),
('Елена', 'Сидорова', '{"Английский"}', '{"preschool"}', 'Окская'),
('Ольга', 'Козлова', '{"Английский", "Немецкий"}', '{"adult"}', 'Окская');