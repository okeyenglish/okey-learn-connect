-- Fix the get_public_schedule function to bypass RLS with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_public_schedule(branch_name text DEFAULT NULL::text)
 RETURNS TABLE(id text, name text, office_name text, level text, compact_days text, compact_time text, compact_classroom text, compact_teacher text, "group_URL" text, "Возраст" text, vacancies integer, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;