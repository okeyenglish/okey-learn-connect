-- Создаем bucket для учебников
INSERT INTO storage.buckets (id, name, public) VALUES ('textbooks', 'textbooks', true);

-- Создаем таблицу для метаданных учебников
CREATE TABLE public.textbooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  program_type TEXT, -- 'kids-box-1', 'prepare', etc.
  category TEXT DEFAULT 'general', -- 'pupil-book', 'activity-book', 'teacher-book', etc.
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sort_order INTEGER DEFAULT 0
);

-- Включаем RLS
ALTER TABLE public.textbooks ENABLE ROW LEVEL SECURITY;

-- Создаем политики для textbooks
CREATE POLICY "Authenticated users can view textbooks" 
ON public.textbooks 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload textbooks" 
ON public.textbooks 
FOR INSERT 
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own textbooks" 
ON public.textbooks 
FOR UPDATE 
USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own textbooks" 
ON public.textbooks 
FOR DELETE 
USING (auth.uid() = uploaded_by);

-- Создаем storage policies для bucket textbooks
CREATE POLICY "Authenticated users can view textbooks" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'textbooks' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload textbooks" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'textbooks' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own uploaded textbooks" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'textbooks' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own uploaded textbooks" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'textbooks' AND auth.uid() IS NOT NULL);

-- Создаем триггер для обновления updated_at
CREATE OR REPLACE FUNCTION public.update_textbooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_textbooks_updated_at
BEFORE UPDATE ON public.textbooks
FOR EACH ROW
EXECUTE FUNCTION public.update_textbooks_updated_at();

-- Вставляем существующие учебники
INSERT INTO public.textbooks (title, description, file_name, file_url, program_type, category, sort_order) VALUES
('Kid''s Box 1 — Обзор учебника', 'Pupil''s Book, Activity Book, Teacher''s Book', 'kids-box-1-cover.pdf', '/textbooks/kids-box-1-cover.pdf', 'kids-box-1', 'overview', 1),
('Unit 4: My family — Урок-пример', 'Семья, аудирование, лексика', 'kids-box-1-family-lesson.pdf', '/textbooks/kids-box-1-family-lesson.pdf', 'kids-box-1', 'lesson-example', 2);