-- ============================================
-- ЭТАП 1: Базовая структура организаций
-- ============================================

-- 1.1. Создать таблицу organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
  plan_type TEXT DEFAULT 'basic' CHECK (plan_type IN ('basic', 'pro', 'enterprise')),
  
  -- Настройки
  settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  
  -- Лимиты
  max_students INTEGER,
  max_users INTEGER,
  max_branches INTEGER,
  
  -- Временные метки
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 1.2. Создать таблицу organization_branches
CREATE TABLE public.organization_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  working_hours JSONB DEFAULT '{"start": "09:00", "end": "21:00"}',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.organization_branches ENABLE ROW LEVEL SECURITY;

-- Создать индекс для производительности
CREATE INDEX idx_org_branches_org_id ON public.organization_branches(organization_id);

-- 1.3. Добавить organization_id во все критичные таблицы
ALTER TABLE public.profiles ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.students ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.clients ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.learning_groups ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.lesson_sessions ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.individual_lessons ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.individual_lesson_sessions ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.payments ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.chat_messages ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.call_logs ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.family_groups ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.courses ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.course_units ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.lessons ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.textbooks ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.classrooms ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.student_segments ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Создать индексы для производительности
CREATE INDEX idx_profiles_org_id ON public.profiles(organization_id);
CREATE INDEX idx_students_org_id ON public.students(organization_id);
CREATE INDEX idx_clients_org_id ON public.clients(organization_id);
CREATE INDEX idx_learning_groups_org_id ON public.learning_groups(organization_id);
CREATE INDEX idx_lesson_sessions_org_id ON public.lesson_sessions(organization_id);
CREATE INDEX idx_individual_lessons_org_id ON public.individual_lessons(organization_id);
CREATE INDEX idx_payments_org_id ON public.payments(organization_id);
CREATE INDEX idx_chat_messages_org_id ON public.chat_messages(organization_id);
CREATE INDEX idx_call_logs_org_id ON public.call_logs(organization_id);
CREATE INDEX idx_family_groups_org_id ON public.family_groups(organization_id);
CREATE INDEX idx_courses_org_id ON public.courses(organization_id);
CREATE INDEX idx_classrooms_org_id ON public.classrooms(organization_id);

-- ============================================
-- ЭТАП 2: Обновление RLS политик
-- ============================================

-- 2.1. Создать функцию для получения organization_id пользователя
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id 
  FROM public.profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- 2.2. RLS политики для organizations
CREATE POLICY "Users can view their organization"
ON public.organizations FOR SELECT
USING (id = get_user_organization_id());

CREATE POLICY "Admins can update their organization"
ON public.organizations FOR UPDATE
USING (id = get_user_organization_id() AND has_role(auth.uid(), 'admin'));

-- 2.3. RLS политики для organization_branches
CREATE POLICY "Users can view their organization branches"
ON public.organization_branches FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage their organization branches"
ON public.organization_branches FOR ALL
USING (organization_id = get_user_organization_id() AND has_role(auth.uid(), 'admin'))
WITH CHECK (organization_id = get_user_organization_id() AND has_role(auth.uid(), 'admin'));

-- 2.4. Обновить существующие RLS политики для таблиц с organization_id

-- Profiles: обновить политики чтобы учитывать organization_id
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view profiles in their organization"
ON public.profiles FOR SELECT
USING (organization_id = get_user_organization_id() OR id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can view all profiles in organization"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'admin') AND organization_id = get_user_organization_id());

-- Students: добавить фильтрацию по organization_id
DROP POLICY IF EXISTS "auth_students" ON public.students;
DROP POLICY IF EXISTS "crm_allow_all_delete_students" ON public.students;
DROP POLICY IF EXISTS "crm_allow_all_insert_students" ON public.students;
DROP POLICY IF EXISTS "crm_allow_all_select_students" ON public.students;
DROP POLICY IF EXISTS "crm_allow_all_update_students" ON public.students;

CREATE POLICY "Users can view students in their organization"
ON public.students FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage students in their organization"
ON public.students FOR ALL
USING (organization_id = get_user_organization_id() AND auth.uid() IS NOT NULL)
WITH CHECK (organization_id = get_user_organization_id() AND auth.uid() IS NOT NULL);

-- Clients: добавить фильтрацию по organization_id
DROP POLICY IF EXISTS "admin_all_clients" ON public.clients;
DROP POLICY IF EXISTS "auth_view_clients" ON public.clients;
DROP POLICY IF EXISTS "managers_branch_clients" ON public.clients;
DROP POLICY IF EXISTS "open_clients_delete" ON public.clients;
DROP POLICY IF EXISTS "open_clients_insert" ON public.clients;
DROP POLICY IF EXISTS "open_clients_select" ON public.clients;
DROP POLICY IF EXISTS "open_clients_update" ON public.clients;

CREATE POLICY "Users can view clients in their organization"
ON public.clients FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage clients in their organization"
ON public.clients FOR ALL
USING (organization_id = get_user_organization_id() AND auth.uid() IS NOT NULL)
WITH CHECK (organization_id = get_user_organization_id() AND auth.uid() IS NOT NULL);

-- Learning Groups: добавить фильтрацию по organization_id
DROP POLICY IF EXISTS "Admins can manage all groups" ON public.learning_groups;
DROP POLICY IF EXISTS "Authenticated users can view all groups" ON public.learning_groups;
DROP POLICY IF EXISTS "Users can manage groups from their branches" ON public.learning_groups;
DROP POLICY IF EXISTS "Users can view groups from their branches" ON public.learning_groups;
DROP POLICY IF EXISTS "auth_groups" ON public.learning_groups;

CREATE POLICY "Users can view groups in their organization"
ON public.learning_groups FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage groups in their organization"
ON public.learning_groups FOR ALL
USING (organization_id = get_user_organization_id() AND auth.uid() IS NOT NULL)
WITH CHECK (organization_id = get_user_organization_id() AND auth.uid() IS NOT NULL);

-- Lesson Sessions: добавить фильтрацию по organization_id
DROP POLICY IF EXISTS "Users can delete lesson sessions" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Users can insert lesson sessions" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Users can update lesson sessions" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Users can view lesson sessions" ON public.lesson_sessions;

CREATE POLICY "Users can view lesson sessions in their organization"
ON public.lesson_sessions FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage lesson sessions in their organization"
ON public.lesson_sessions FOR ALL
USING (organization_id = get_user_organization_id() AND auth.uid() IS NOT NULL)
WITH CHECK (organization_id = get_user_organization_id() AND auth.uid() IS NOT NULL);

-- Individual Lessons: добавить фильтрацию по organization_id
DROP POLICY IF EXISTS "Users can delete individual lessons for their branches" ON public.individual_lessons;
DROP POLICY IF EXISTS "Users can insert individual lessons for their branches" ON public.individual_lessons;
DROP POLICY IF EXISTS "Users can update individual lessons for their branches" ON public.individual_lessons;
DROP POLICY IF EXISTS "Users can view individual lessons" ON public.individual_lessons;

CREATE POLICY "Users can view individual lessons in their organization"
ON public.individual_lessons FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage individual lessons in their organization"
ON public.individual_lessons FOR ALL
USING (organization_id = get_user_organization_id() AND auth.uid() IS NOT NULL)
WITH CHECK (organization_id = get_user_organization_id() AND auth.uid() IS NOT NULL);

-- Payments: добавить фильтрацию по organization_id
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments;
DROP POLICY IF EXISTS "Managers can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view payments from their branches" ON public.payments;

CREATE POLICY "Users can view payments in their organization"
ON public.payments FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Managers can manage payments in their organization"
ON public.payments FOR ALL
USING (organization_id = get_user_organization_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')))
WITH CHECK (organization_id = get_user_organization_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')));

-- Chat Messages: добавить фильтрацию по organization_id
DROP POLICY IF EXISTS "admin_all_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "auth_view_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "managers_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "open_chat_messages_delete" ON public.chat_messages;
DROP POLICY IF EXISTS "open_chat_messages_insert" ON public.chat_messages;
DROP POLICY IF EXISTS "open_chat_messages_select" ON public.chat_messages;
DROP POLICY IF EXISTS "open_chat_messages_update" ON public.chat_messages;

CREATE POLICY "Users can view chat messages in their organization"
ON public.chat_messages FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage chat messages in their organization"
ON public.chat_messages FOR ALL
USING (organization_id = get_user_organization_id() AND auth.uid() IS NOT NULL)
WITH CHECK (organization_id = get_user_organization_id() AND auth.uid() IS NOT NULL);

-- Call Logs: добавить фильтрацию по organization_id
DROP POLICY IF EXISTS "admin_all_calls" ON public.call_logs;
DROP POLICY IF EXISTS "auth_view_calls" ON public.call_logs;
DROP POLICY IF EXISTS "managers_calls" ON public.call_logs;
DROP POLICY IF EXISTS "open_call_logs_delete" ON public.call_logs;
DROP POLICY IF EXISTS "open_call_logs_insert" ON public.call_logs;
DROP POLICY IF EXISTS "open_call_logs_select" ON public.call_logs;
DROP POLICY IF EXISTS "open_call_logs_update" ON public.call_logs;

CREATE POLICY "Users can view call logs in their organization"
ON public.call_logs FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage call logs in their organization"
ON public.call_logs FOR ALL
USING (organization_id = get_user_organization_id() AND auth.uid() IS NOT NULL)
WITH CHECK (organization_id = get_user_organization_id() AND auth.uid() IS NOT NULL);

-- Family Groups: добавить фильтрацию по organization_id
DROP POLICY IF EXISTS "auth_family_groups" ON public.family_groups;
DROP POLICY IF EXISTS "crm_allow_all_delete_family_groups" ON public.family_groups;
DROP POLICY IF EXISTS "crm_allow_all_insert_family_groups" ON public.family_groups;
DROP POLICY IF EXISTS "crm_allow_all_select_family_groups" ON public.family_groups;
DROP POLICY IF EXISTS "crm_allow_all_update_family_groups" ON public.family_groups;
DROP POLICY IF EXISTS "open_family_groups_delete" ON public.family_groups;
DROP POLICY IF EXISTS "open_family_groups_insert" ON public.family_groups;
DROP POLICY IF EXISTS "open_family_groups_select" ON public.family_groups;
DROP POLICY IF EXISTS "open_family_groups_update" ON public.family_groups;

CREATE POLICY "Users can view family groups in their organization"
ON public.family_groups FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage family groups in their organization"
ON public.family_groups FOR ALL
USING (organization_id = get_user_organization_id() AND auth.uid() IS NOT NULL)
WITH CHECK (organization_id = get_user_organization_id() AND auth.uid() IS NOT NULL);

-- Courses: добавить фильтрацию по organization_id
DROP POLICY IF EXISTS "courses_manage_admin_methodist" ON public.courses;
DROP POLICY IF EXISTS "courses_select_auth" ON public.courses;

CREATE POLICY "Users can view courses in their organization"
ON public.courses FOR SELECT
USING (organization_id = get_user_organization_id() OR organization_id IS NULL);

CREATE POLICY "Admins and methodists can manage courses in their organization"
ON public.courses FOR ALL
USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'methodist')) AND (organization_id = get_user_organization_id() OR organization_id IS NULL))
WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'methodist')) AND (organization_id = get_user_organization_id() OR organization_id IS NULL));

-- Classrooms: добавить фильтрацию по organization_id
DROP POLICY IF EXISTS "Admins and managers can manage classrooms from their branches" ON public.classrooms;
DROP POLICY IF EXISTS "Authenticated users can view all classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Users can view classrooms from their branches" ON public.classrooms;

CREATE POLICY "Users can view classrooms in their organization"
ON public.classrooms FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins and managers can manage classrooms in their organization"
ON public.classrooms FOR ALL
USING (organization_id = get_user_organization_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'branch_manager')))
WITH CHECK (organization_id = get_user_organization_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'branch_manager')));

-- Student Segments: добавить фильтрацию по organization_id
DROP POLICY IF EXISTS "Authenticated users can view segments" ON public.student_segments;
DROP POLICY IF EXISTS "Admins and managers can manage segments" ON public.student_segments;

CREATE POLICY "Users can view segments in their organization"
ON public.student_segments FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins and managers can manage segments in their organization"
ON public.student_segments FOR ALL
USING (organization_id = get_user_organization_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'branch_manager')))
WITH CHECK (organization_id = get_user_organization_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'branch_manager')));

-- Добавить триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION public.update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_organizations_updated_at();

CREATE TRIGGER update_organization_branches_updated_at
BEFORE UPDATE ON public.organization_branches
FOR EACH ROW
EXECUTE FUNCTION public.update_organizations_updated_at();