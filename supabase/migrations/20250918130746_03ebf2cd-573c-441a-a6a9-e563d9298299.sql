-- Create table for schedule management
CREATE TABLE public.schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  office_name TEXT NOT NULL,
  level TEXT NOT NULL,
  compact_days TEXT NOT NULL,
  compact_time TEXT NOT NULL,
  compact_classroom TEXT NOT NULL,
  compact_teacher TEXT NOT NULL,
  vacancies INTEGER NOT NULL DEFAULT 0,
  group_link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;

-- Create policies (public read access for schedule display)
CREATE POLICY "Schedule is viewable by everyone" 
ON public.schedule 
FOR SELECT 
USING (is_active = true);

-- For now, anyone can manage schedule (you can restrict this later)
CREATE POLICY "Anyone can manage schedule" 
ON public.schedule 
FOR ALL 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_schedule_updated_at
BEFORE UPDATE ON public.schedule
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data for each branch
INSERT INTO public.schedule (name, office_name, level, compact_days, compact_time, compact_classroom, compact_teacher, vacancies) VALUES
('English for Kids', 'Новокосино', 'A1', 'Пн, Ср, Пт', '16:00-17:30', 'Кабинет 1', 'Анна Иванова', 3),
('General English', 'Новокосино', 'B1', 'Вт, Чт', '18:00-19:30', 'Кабинет 2', 'Елена Петрова', 1),
('Advanced English', 'Новокосино', 'C1', 'Сб', '10:00-13:00', 'Кабинет 3', 'Михаил Сидоров', 0),

('Kids Box', 'Стахановская', 'A1', 'Пн, Ср, Пт', '15:00-16:30', 'Кабинет А', 'Мария Смирнова', 4),
('Prepare', 'Стахановская', 'B2', 'Вт, Чт', '17:00-18:30', 'Кабинет Б', 'Дмитрий Козлов', 2),

('Super Safari', 'Окская', 'A1', 'Пн, Ср, Пт', '16:30-18:00', 'Класс 1', 'Ольга Николаева', 5),
('Empower', 'Окская', 'B1', 'Сб, Вс', '11:00-12:30', 'Класс 2', 'Андрей Волков', 3),

('Online Kids', 'Онлайн', 'A1', 'Пн, Ср, Пт', '17:00-18:00', 'Zoom 1', 'Юлия Морозова', 8),
('Online Business', 'Онлайн', 'B2', 'Вт, Чт', '20:00-21:30', 'Zoom 2', 'Сергей Лебедев', 6),
('Online Advanced', 'Онлайн', 'C1', 'Сб', '14:00-16:00', 'Zoom 3', 'Екатерина Белова', 4);