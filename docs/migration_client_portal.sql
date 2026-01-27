-- =============================================
-- AcademyOS CRM - Client/Student Portal Schema
-- Run on self-hosted Supabase (api.academyos.ru)
-- =============================================

-- Таблица приглашений клиентов (родителей)
CREATE TABLE IF NOT EXISTS public.client_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  invite_token TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  first_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Таблица приглашений студентов (детей с собственным аккаунтом)
CREATE TABLE IF NOT EXISTS public.student_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  parent_client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  invite_token TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  first_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Связь клиентов с auth.users для личного кабинета
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN DEFAULT false;

-- Связь студентов с auth.users для их собственного личного кабинета
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.clients(id);

-- Таблица домашних заданий
CREATE TABLE IF NOT EXISTS public.homework (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.learning_groups(id) ON DELETE CASCADE,
  lesson_session_id UUID REFERENCES public.lesson_sessions(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'submitted', 'reviewed', 'completed')),
  student_answer TEXT,
  student_files JSONB DEFAULT '[]',
  teacher_feedback TEXT,
  grade TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Дневник занятий / прогресс студента
CREATE TABLE IF NOT EXISTS public.student_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  lesson_session_id UUID REFERENCES public.lesson_sessions(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id),
  lesson_date DATE NOT NULL,
  attendance TEXT DEFAULT 'present' CHECK (attendance IN ('present', 'absent', 'late', 'excused')),
  grade TEXT,
  teacher_notes TEXT,
  homework_done BOOLEAN DEFAULT false,
  activity_score INTEGER CHECK (activity_score >= 1 AND activity_score <= 5),
  topics_covered TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

-- Политики для client_invitations (публичный SELECT для проверки токена)
DROP POLICY IF EXISTS "client_invitations_select_by_token" ON public.client_invitations;
CREATE POLICY "client_invitations_select_by_token" ON public.client_invitations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "client_invitations_insert_by_org" ON public.client_invitations;
CREATE POLICY "client_invitations_insert_by_org" ON public.client_invitations
  FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "client_invitations_update_by_org" ON public.client_invitations;
CREATE POLICY "client_invitations_update_by_org" ON public.client_invitations
  FOR UPDATE USING (organization_id = public.get_user_organization_id());

-- Политики для student_invitations  
DROP POLICY IF EXISTS "student_invitations_select_by_token" ON public.student_invitations;
CREATE POLICY "student_invitations_select_by_token" ON public.student_invitations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "student_invitations_insert_by_org" ON public.student_invitations;
CREATE POLICY "student_invitations_insert_by_org" ON public.student_invitations
  FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "student_invitations_update_by_org" ON public.student_invitations;
CREATE POLICY "student_invitations_update_by_org" ON public.student_invitations
  FOR UPDATE USING (organization_id = public.get_user_organization_id());

-- Политики для homework
DROP POLICY IF EXISTS "homework_select_by_org_or_student" ON public.homework;
CREATE POLICY "homework_select_by_org_or_student" ON public.homework
  FOR SELECT USING (
    organization_id = public.get_user_organization_id()
    OR student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
    OR student_id IN (
      SELECT s.id FROM public.students s 
      JOIN public.clients c ON s.parent_id = c.id 
      WHERE c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "homework_insert_by_org" ON public.homework;
CREATE POLICY "homework_insert_by_org" ON public.homework
  FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "homework_update_by_org_or_student" ON public.homework;
CREATE POLICY "homework_update_by_org_or_student" ON public.homework
  FOR UPDATE USING (
    organization_id = public.get_user_organization_id()
    OR student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

-- Политики для student_progress
DROP POLICY IF EXISTS "student_progress_select_by_org_or_student" ON public.student_progress;
CREATE POLICY "student_progress_select_by_org_or_student" ON public.student_progress
  FOR SELECT USING (
    organization_id = public.get_user_organization_id()
    OR student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
    OR student_id IN (
      SELECT s.id FROM public.students s 
      JOIN public.clients c ON s.parent_id = c.id 
      WHERE c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "student_progress_insert_by_org" ON public.student_progress;
CREATE POLICY "student_progress_insert_by_org" ON public.student_progress
  FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "student_progress_update_by_org" ON public.student_progress;
CREATE POLICY "student_progress_update_by_org" ON public.student_progress
  FOR UPDATE USING (organization_id = public.get_user_organization_id());

-- Triggers
DROP TRIGGER IF EXISTS update_client_invitations_updated_at ON public.client_invitations;
CREATE TRIGGER update_client_invitations_updated_at
  BEFORE UPDATE ON public.client_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_invitations_updated_at ON public.student_invitations;
CREATE TRIGGER update_student_invitations_updated_at
  BEFORE UPDATE ON public.student_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_homework_updated_at ON public.homework;
CREATE TRIGGER update_homework_updated_at
  BEFORE UPDATE ON public.homework
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_progress_updated_at ON public.student_progress;
CREATE TRIGGER update_student_progress_updated_at
  BEFORE UPDATE ON public.student_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Индексы
CREATE INDEX IF NOT EXISTS idx_client_invitations_token ON public.client_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_client_invitations_phone ON public.client_invitations(phone);
CREATE INDEX IF NOT EXISTS idx_student_invitations_token ON public.student_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_homework_student_id ON public.homework(student_id);
CREATE INDEX IF NOT EXISTS idx_homework_due_date ON public.homework(due_date);
CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON public.student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_lesson_date ON public.student_progress(lesson_date);

-- Функция для получения студентов родителя
CREATE OR REPLACE FUNCTION public.get_parent_students()
RETURNS SETOF public.students
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.* FROM public.students s
  JOIN public.clients c ON s.parent_id = c.id
  WHERE c.user_id = auth.uid()
  AND s.is_active = true;
$$;

-- Функция для проверки доступа родителя к студенту
CREATE OR REPLACE FUNCTION public.parent_has_access_to_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.clients c ON s.parent_id = c.id
    WHERE s.id = p_student_id
    AND c.user_id = auth.uid()
  );
$$;

-- Проверка является ли пользователь студентом
CREATE OR REPLACE FUNCTION public.is_student()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students
    WHERE user_id = auth.uid()
    AND portal_enabled = true
  );
$$;

-- Проверка является ли пользователь родителем
CREATE OR REPLACE FUNCTION public.is_parent()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients
    WHERE user_id = auth.uid()
    AND portal_enabled = true
  );
$$;

COMMENT ON TABLE public.client_invitations IS 'Приглашения для родителей на регистрацию в личном кабинете';
COMMENT ON TABLE public.student_invitations IS 'Приглашения для студентов на регистрацию в личном кабинете';
COMMENT ON TABLE public.homework IS 'Домашние задания студентов';
COMMENT ON TABLE public.student_progress IS 'Дневник занятий и прогресс студента';
