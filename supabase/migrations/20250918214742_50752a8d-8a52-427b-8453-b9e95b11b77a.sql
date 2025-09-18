-- Drop the existing view
DROP VIEW IF EXISTS public.schedule_public;

-- Create the view with proper ownership and security context
-- Use a simple approach that doesn't require special privileges
CREATE VIEW public.schedule_public AS
SELECT 
  id,
  name,
  office_name,
  level,
  compact_days,
  compact_time,
  compact_classroom,
  -- Always show generic teacher name for security
  'Преподаватель'::text as compact_teacher,
  -- Always hide group URLs for security  
  NULL::text as "group_URL",
  "Возраст",
  vacancies,
  is_active,
  created_at,
  updated_at
FROM public.schedule
WHERE is_active = true;

-- Change ownership to the authenticated role to avoid security definer behavior
ALTER VIEW public.schedule_public OWNER TO authenticated;

-- Grant explicit permissions
GRANT SELECT ON public.schedule_public TO anon;
GRANT SELECT ON public.schedule_public TO authenticated;
GRANT SELECT ON public.schedule_public TO service_role;

-- Ensure the underlying table permissions are correct
-- Revoke any existing public permissions on the schedule table
REVOKE ALL ON public.schedule FROM anon;
REVOKE ALL ON public.schedule FROM authenticated;

-- Grant only necessary permissions to service_role for admin operations
GRANT ALL ON public.schedule TO service_role;

-- Add security comment
COMMENT ON VIEW public.schedule_public IS 'Public-safe view of schedule data. Owned by authenticated role to avoid security definer issues.';