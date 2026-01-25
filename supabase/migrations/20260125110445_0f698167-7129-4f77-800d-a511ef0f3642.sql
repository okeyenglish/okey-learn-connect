-- =============================================
-- AcademyOS CRM - Core Schema with RLS
-- =============================================

-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'teacher', 'branch_manager', 'accountant');

-- 2. Organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  branch TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  middle_name TEXT,
  phone TEXT,
  email TEXT,
  telegram_user_id TEXT,
  whatsapp_id TEXT,
  salebot_client_id TEXT,
  notes TEXT,
  status TEXT DEFAULT 'new',
  source TEXT,
  branch TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_organization_id ON public.clients(organization_id);
CREATE INDEX idx_clients_phone ON public.clients(phone);
CREATE INDEX idx_clients_telegram_user_id ON public.clients(telegram_user_id);
CREATE INDEX idx_clients_salebot_client_id ON public.clients(salebot_client_id);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 6. Students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  middle_name TEXT,
  birth_date DATE,
  age INTEGER,
  phone TEXT,
  email TEXT,
  level TEXT,
  balance NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  branch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_students_organization_id ON public.students(organization_id);
CREATE INDEX idx_students_client_id ON public.students(client_id);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS (Security Definer)
-- =============================================

-- Get user's organization_id
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Update updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Organizations: Users can view their own org, admins can manage
CREATE POLICY "Users can view their organization"
ON public.organizations FOR SELECT
TO authenticated
USING (id = public.get_user_organization_id());

CREATE POLICY "Admins can manage organizations"
ON public.organizations FOR ALL
TO authenticated
USING (public.is_admin());

-- Profiles: Users can view/update their own, admins can view all in org
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can view profiles in their organization"
ON public.profiles FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can manage profiles in org"
ON public.profiles FOR ALL
TO authenticated
USING (
  public.is_admin() AND 
  organization_id = public.get_user_organization_id()
);

CREATE POLICY "Service role full access to profiles"
ON public.profiles FOR ALL
TO service_role
USING (true);

-- User roles: Only admins can manage, users can view own
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin());

CREATE POLICY "Service role full access to roles"
ON public.user_roles FOR ALL
TO service_role
USING (true);

-- Clients: Organization-scoped access
CREATE POLICY "Users can view clients in their organization"
ON public.clients FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can create clients in their organization"
ON public.clients FOR INSERT
TO authenticated
WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update clients in their organization"
ON public.clients FOR UPDATE
TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can delete clients"
ON public.clients FOR DELETE
TO authenticated
USING (
  public.is_admin() AND 
  organization_id = public.get_user_organization_id()
);

CREATE POLICY "Service role full access to clients"
ON public.clients FOR ALL
TO service_role
USING (true);

-- Students: Organization-scoped access
CREATE POLICY "Users can view students in their organization"
ON public.students FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can create students in their organization"
ON public.students FOR INSERT
TO authenticated
WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update students in their organization"
ON public.students FOR UPDATE
TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can delete students"
ON public.students FOR DELETE
TO authenticated
USING (
  public.is_admin() AND 
  organization_id = public.get_user_organization_id()
);

CREATE POLICY "Service role full access to students"
ON public.students FOR ALL
TO service_role
USING (true);

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();