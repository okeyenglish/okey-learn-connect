-- Alternative approach: Create a function instead of a view to avoid security definer view issues
-- Drop the existing view
DROP VIEW IF EXISTS public.schedule_public;

-- Create a security invoker function instead of a security definer view
CREATE OR REPLACE FUNCTION public.get_public_schedule(branch_name text DEFAULT NULL)
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
SECURITY INVOKER  -- This explicitly uses invoker's permissions, not definer's
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
    'Преподаватель'::text as compact_teacher,  -- Hide real teacher names
    NULL::text as "group_URL",                 -- Hide group URLs
    s."Возраст",
    s.vacancies,
    s.is_active,
    s.created_at,
    s.updated_at
  FROM public.schedule s
  WHERE s.is_active = true
  AND (branch_name IS NULL OR s.office_name = branch_name);
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_public_schedule(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_schedule(text) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.get_public_schedule(text) IS 'Returns public-safe schedule data with sensitive information hidden. Uses SECURITY INVOKER to avoid security definer issues.';