-- Phase 1: Address Teacher Data Exposure
-- Create a security definer function to check if user should see teacher info
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- For now, return false since no auth is implemented
  -- This can be updated later when authentication is added
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update schedule RLS policies to restrict teacher information
DROP POLICY IF EXISTS "Schedule is viewable by everyone" ON public.schedule;
DROP POLICY IF EXISTS "Anyone can manage schedule" ON public.schedule;

-- Create new restrictive policy for public access (hides teacher names and URLs)
CREATE POLICY "Public can view limited schedule info" 
ON public.schedule 
FOR SELECT 
USING (
  is_active = true AND 
  -- Allow full access to admins, limited access to public
  (public.is_admin_user() OR (compact_teacher IS NULL OR compact_teacher = '' OR "group_URL" IS NULL OR "group_URL" = ''))
);

-- Create admin policy for full access
CREATE POLICY "Admins can manage all schedule data" 
ON public.schedule 
FOR ALL 
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Create a public view that exposes only safe schedule information
CREATE OR REPLACE VIEW public.schedule_public AS
SELECT 
  id,
  name,
  office_name,
  level,
  compact_days,
  compact_time,
  compact_classroom,
  -- Hide teacher names and group URLs for security
  CASE 
    WHEN public.is_admin_user() THEN compact_teacher 
    ELSE 'Преподаватель'
  END as compact_teacher,
  CASE 
    WHEN public.is_admin_user() THEN "group_URL" 
    ELSE NULL
  END as "group_URL",
  "Возраст",
  vacancies,
  is_active,
  created_at,
  updated_at
FROM public.schedule
WHERE is_active = true;

-- Grant access to the public view
GRANT SELECT ON public.schedule_public TO anon;
GRANT SELECT ON public.schedule_public TO authenticated;

-- Add comments to document the security considerations
COMMENT ON TABLE public.schedule IS 'Contains sensitive teacher information. Use schedule_public view for public access.';
COMMENT ON VIEW public.schedule_public IS 'Public-safe view of schedule data with teacher information masked for non-admin users.';

-- Create an index on is_active for better performance
CREATE INDEX IF NOT EXISTS idx_schedule_is_active ON public.schedule(is_active) WHERE is_active = true;