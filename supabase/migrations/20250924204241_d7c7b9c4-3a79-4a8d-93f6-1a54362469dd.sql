-- Create courses, units, and lessons tables for dynamic course planning
-- 1) Courses
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Course Units
CREATE TABLE IF NOT EXISTS public.course_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  unit_number INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  lessons_count INT NOT NULL DEFAULT 0,
  vocabulary TEXT,
  grammar TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT course_units_unique UNIQUE (course_id, unit_number)
);

CREATE INDEX IF NOT EXISTS idx_course_units_course ON public.course_units(course_id);
CREATE INDEX IF NOT EXISTS idx_course_units_number ON public.course_units(unit_number);

-- 3) Unit Lessons
CREATE TABLE IF NOT EXISTS public.unit_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.course_units(id) ON DELETE CASCADE,
  lesson_number INT NOT NULL,
  title TEXT NOT NULL,
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  vocabulary JSONB NOT NULL DEFAULT '[]'::jsonb,
  grammar JSONB NOT NULL DEFAULT '[]'::jsonb,
  activities JSONB NOT NULL DEFAULT '[]'::jsonb,
  materials JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unit_lessons_unique UNIQUE (unit_id, lesson_number)
);

CREATE INDEX IF NOT EXISTS idx_unit_lessons_unit ON public.unit_lessons(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_lessons_number ON public.unit_lessons(lesson_number);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_lessons ENABLE ROW LEVEL SECURITY;

-- Read policies - обычные пользователи могут читать курсы
DROP POLICY IF EXISTS "courses_select_auth" ON public.courses;
CREATE POLICY "courses_select_auth" ON public.courses
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "course_units_select_auth" ON public.course_units;
CREATE POLICY "course_units_select_auth" ON public.course_units
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "unit_lessons_select_auth" ON public.unit_lessons;
CREATE POLICY "unit_lessons_select_auth" ON public.unit_lessons
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Management policies - админы и методисты могут управлять
DROP POLICY IF EXISTS "courses_manage_admin_methodist" ON public.courses;
CREATE POLICY "courses_manage_admin_methodist" ON public.courses
FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'methodist'))
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'methodist'));

DROP POLICY IF EXISTS "course_units_manage_admin_methodist" ON public.course_units;
CREATE POLICY "course_units_manage_admin_methodist" ON public.course_units
FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'methodist'))
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'methodist'));

DROP POLICY IF EXISTS "unit_lessons_manage_admin_methodist" ON public.unit_lessons;
CREATE POLICY "unit_lessons_manage_admin_methodist" ON public.unit_lessons
FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'methodist'))
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'methodist'));