-- =============================================
-- Teachers, Learning Groups, Lesson Sessions
-- =============================================

-- 1. Teachers table
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  subjects TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  branch TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Learning Groups table
CREATE TABLE IF NOT EXISTS public.learning_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  responsible_teacher TEXT,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  subject TEXT,
  level TEXT,
  category TEXT,
  group_type TEXT DEFAULT 'group',
  branch TEXT,
  schedule_days TEXT[] DEFAULT '{}',
  schedule_time TEXT,
  max_students INTEGER DEFAULT 12,
  current_students INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Lesson Sessions table
CREATE TABLE IF NOT EXISTS public.lesson_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.learning_groups(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  teacher_name TEXT,
  lesson_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  classroom TEXT,
  status TEXT DEFAULT 'scheduled',
  branch TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_teachers_org ON public.teachers(organization_id);
CREATE INDEX IF NOT EXISTS idx_teachers_profile ON public.teachers(profile_id);
CREATE INDEX IF NOT EXISTS idx_teachers_active ON public.teachers(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_groups_org ON public.learning_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_groups_teacher ON public.learning_groups(teacher_id);
CREATE INDEX IF NOT EXISTS idx_groups_active ON public.learning_groups(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_sessions_org ON public.lesson_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_group ON public.lesson_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher ON public.lesson_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.lesson_sessions(lesson_date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.lesson_sessions(status);

-- =============================================
-- Updated_at triggers
-- =============================================
CREATE TRIGGER update_teachers_updated_at
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_learning_groups_updated_at
  BEFORE UPDATE ON public.learning_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lesson_sessions_updated_at
  BEFORE UPDATE ON public.lesson_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Enable RLS
-- =============================================
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_sessions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies: teachers
-- =============================================

-- Users can view teachers in their organization
CREATE POLICY "Users can view teachers in their organization"
ON public.teachers FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization_id());

-- Teachers can view their own record
CREATE POLICY "Teachers can view own record"
ON public.teachers FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- Users can create teachers in their organization
CREATE POLICY "Users can create teachers in their organization"
ON public.teachers FOR INSERT
TO authenticated
WITH CHECK (organization_id = public.get_user_organization_id());

-- Admins/managers can update teachers
CREATE POLICY "Admins can update teachers"
ON public.teachers FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_organization_id() 
  AND (public.is_admin() OR public.has_role(auth.uid(), 'manager'))
);

-- Teachers can update their own record
CREATE POLICY "Teachers can update own record"
ON public.teachers FOR UPDATE
TO authenticated
USING (profile_id = auth.uid());

-- Admins can delete teachers
CREATE POLICY "Admins can delete teachers"
ON public.teachers FOR DELETE
TO authenticated
USING (organization_id = public.get_user_organization_id() AND public.is_admin());

-- Service role full access
CREATE POLICY "Service role full access to teachers"
ON public.teachers FOR ALL
TO service_role
USING (true);

-- =============================================
-- RLS Policies: learning_groups
-- =============================================

-- Users can view groups in their organization
CREATE POLICY "Users can view groups in their organization"
ON public.learning_groups FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization_id());

-- Users can create groups in their organization
CREATE POLICY "Users can create groups in their organization"
ON public.learning_groups FOR INSERT
TO authenticated
WITH CHECK (organization_id = public.get_user_organization_id());

-- Admins/managers can update groups
CREATE POLICY "Admins can update groups"
ON public.learning_groups FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_organization_id() 
  AND (public.is_admin() OR public.has_role(auth.uid(), 'manager'))
);

-- Responsible teacher can update their groups
CREATE POLICY "Teachers can update assigned groups"
ON public.learning_groups FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND teacher_id IN (
    SELECT id FROM public.teachers WHERE profile_id = auth.uid()
  )
);

-- Admins can delete groups
CREATE POLICY "Admins can delete groups"
ON public.learning_groups FOR DELETE
TO authenticated
USING (organization_id = public.get_user_organization_id() AND public.is_admin());

-- Service role full access
CREATE POLICY "Service role full access to groups"
ON public.learning_groups FOR ALL
TO service_role
USING (true);

-- =============================================
-- RLS Policies: lesson_sessions
-- =============================================

-- Users can view sessions in their organization
CREATE POLICY "Users can view sessions in their organization"
ON public.lesson_sessions FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization_id());

-- Users can create sessions in their organization
CREATE POLICY "Users can create sessions in their organization"
ON public.lesson_sessions FOR INSERT
TO authenticated
WITH CHECK (organization_id = public.get_user_organization_id());

-- Admins/managers can update sessions
CREATE POLICY "Admins can update sessions"
ON public.lesson_sessions FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_organization_id() 
  AND (public.is_admin() OR public.has_role(auth.uid(), 'manager'))
);

-- Teachers can update their own sessions
CREATE POLICY "Teachers can update own sessions"
ON public.lesson_sessions FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND teacher_id IN (
    SELECT id FROM public.teachers WHERE profile_id = auth.uid()
  )
);

-- Admins can delete sessions
CREATE POLICY "Admins can delete sessions"
ON public.lesson_sessions FOR DELETE
TO authenticated
USING (organization_id = public.get_user_organization_id() AND public.is_admin());

-- Service role full access
CREATE POLICY "Service role full access to sessions"
ON public.lesson_sessions FOR ALL
TO service_role
USING (true);

-- =============================================
-- Enable realtime for lesson_sessions
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_sessions;