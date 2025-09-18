-- Drop the existing view
DROP VIEW IF EXISTS public.schedule_public;

-- Instead of a view, create a function that returns the same data
-- This avoids the security definer view issue entirely
CREATE OR REPLACE FUNCTION public.get_public_schedule()
RETURNS TABLE (
  id text,
  name text,
  office_name text,
  level text,
  compact_days text,
  compact_time text,
  compact_classroom text,
  compact_teacher text,
  "group_URL" text,
  "Возраст" text,
  vacancies integer,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.name,
    s.office_name,
    s.level,
    s.compact_days,
    s.compact_time,
    s.compact_classroom,
    -- Always show generic teacher name for security
    'Преподаватель'::text as compact_teacher,
    -- Always hide group URLs for security
    NULL::text as "group_URL",
    s."Возраст",
    s.vacancies,
    s.is_active,
    s.created_at,
    s.updated_at
  FROM public.schedule s
  WHERE s.is_active = true;
$$;

-- Grant permissions to use the function
GRANT EXECUTE ON FUNCTION public.get_public_schedule() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_schedule() TO authenticated;

-- Add comment explaining the security approach
COMMENT ON FUNCTION public.get_public_schedule() IS 'Returns public-safe schedule data. Uses SECURITY INVOKER to avoid security definer issues.';