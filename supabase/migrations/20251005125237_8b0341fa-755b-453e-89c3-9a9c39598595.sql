-- Create group_course_prices table for storing course subscription prices
CREATE TABLE IF NOT EXISTS public.group_course_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 80,
  price_8_lessons NUMERIC NOT NULL DEFAULT 0,
  price_24_lessons NUMERIC NOT NULL DEFAULT 0,
  price_80_lessons NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(course_name)
);

-- Enable RLS
ALTER TABLE public.group_course_prices ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view prices
CREATE POLICY "Authenticated users can view group course prices"
  ON public.group_course_prices
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow admins and methodists to manage prices
CREATE POLICY "Admins and methodists can manage group course prices"
  ON public.group_course_prices
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'methodist'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'methodist'::app_role)
  );

-- Insert default courses
INSERT INTO public.group_course_prices (course_name, duration_minutes, price_8_lessons, price_24_lessons, price_80_lessons)
VALUES 
  ('Super Safari', 80, 0, 0, 0),
  ('Kid''s Box', 80, 0, 0, 0),
  ('Prepare', 80, 0, 0, 0),
  ('Empower', 80, 0, 0, 0),
  ('Speaking Club', 80, 0, 0, 0),
  ('Workshop', 80, 0, 0, 0)
ON CONFLICT (course_name) DO NOTHING;