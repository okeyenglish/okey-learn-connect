-- Fix high Disk IO caused by recursive RLS policies on profiles table
-- Root cause: get_user_organization_id() queries profiles, but profiles RLS calls get_user_organization_id()

-- Step 1: Fix get_user_organization_id() to use SECURITY DEFINER (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id 
  FROM public.profiles 
  WHERE id = auth.uid()
  LIMIT 1
$$;

-- Step 2: Fix has_role() to use SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 3: Drop ALL existing profiles policies (10 conflicting/redundant policies)
DROP POLICY IF EXISTS "Admins can view all profiles in organization" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "admin_all_profiles" ON profiles;
DROP POLICY IF EXISTS "auth_view_profiles" ON profiles;
DROP POLICY IF EXISTS "open_profiles_select" ON profiles;
DROP POLICY IF EXISTS "open_profiles_update" ON profiles;
DROP POLICY IF EXISTS "open_profiles_delete" ON profiles;
DROP POLICY IF EXISTS "open_profiles_insert" ON profiles;
DROP POLICY IF EXISTS "users_own_profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Step 4: Create new optimized RLS policies for profiles
-- These use direct subqueries instead of calling get_user_organization_id() to avoid any potential recursion

-- SELECT: Users can view their own profile and profiles in their organization
CREATE POLICY "profiles_select"
ON public.profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- UPDATE: Users can only update their own profile
CREATE POLICY "profiles_update"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- INSERT: Users can insert their own profile (for handle_new_user trigger)
CREATE POLICY "profiles_insert"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- DELETE: Only admins can delete profiles
CREATE POLICY "profiles_delete"
ON public.profiles FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Step 5: Add index on user_roles for faster role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role 
ON public.user_roles(user_id, role);