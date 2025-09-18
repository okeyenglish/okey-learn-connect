-- Fix the security definer function by setting search_path
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- For now, return false since no auth is implemented
  -- This can be updated later when authentication is added
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Recreate the view without SECURITY DEFINER (regular view is sufficient)
DROP VIEW IF EXISTS public.schedule_public;

CREATE VIEW public.schedule_public AS
SELECT 
  id,
  name,
  office_name,
  level,
  compact_days,
  compact_time,
  compact_classroom,
  -- Show generic teacher name for security
  'Преподаватель' as compact_teacher,
  -- Hide group URLs completely for security
  NULL as "group_URL",
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

-- Update comment to reflect the simplified approach
COMMENT ON VIEW public.schedule_public IS 'Public-safe view of schedule data with teacher names and URLs hidden for security.';