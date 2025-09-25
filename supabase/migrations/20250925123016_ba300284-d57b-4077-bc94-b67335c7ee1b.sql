-- First, create the lessons table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.course_units(id),
  lesson_number integer NOT NULL,
  title text NOT NULL,
  objectives text,
  lesson_structure text,
  homework text,
  materials text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for lessons table
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Create policies for lessons
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "lessons_select_auth" ON public.lessons;
  DROP POLICY IF EXISTS "lessons_manage_admin_methodist" ON public.lessons;
  
  -- Create new policies
  CREATE POLICY "lessons_select_auth" ON public.lessons FOR SELECT USING (auth.uid() IS NOT NULL);
  CREATE POLICY "lessons_manage_admin_methodist" ON public.lessons FOR ALL 
    USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role));
END $$;