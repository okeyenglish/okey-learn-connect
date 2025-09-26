-- Ensure RLS is enabled and admins can read all profiles and manage user_roles so Admin panel can list real users

-- PROFILES: allow admins to view all profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create a permissive policy for admins to select all profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins can view all profiles'
  ) THEN
    CREATE POLICY "Admins can view all profiles"
    ON public.profiles
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END$$;

-- Optionally allow branch managers to view profiles from their branches (helps management views)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Branch managers can view branch profiles'
  ) THEN
    CREATE POLICY "Branch managers can view branch profiles"
    ON public.profiles
    FOR SELECT
    USING (
      public.has_role(auth.uid(), 'branch_manager') AND (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND (p.branch = profiles.branch)
        ) OR EXISTS (
          SELECT 1 FROM public.manager_branches mb
          WHERE mb.manager_id = auth.uid() AND mb.branch = profiles.branch
        )
      )
    );
  END IF;
END$$;

-- USER_ROLES: allow admins to manage and read all user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Admins manage user_roles'
  ) THEN
    CREATE POLICY "Admins manage user_roles"
    ON public.user_roles
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END$$;

-- Also allow users to view their own roles (harmless and common)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Users can view their own roles'
  ) THEN
    CREATE POLICY "Users can view their own roles"
    ON public.user_roles
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END$$;