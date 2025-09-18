-- Remove the unnecessary is_admin_user function since we're using a simplified approach
DROP FUNCTION IF EXISTS public.is_admin_user();

-- Recreate the schedule_public view without any SECURITY DEFINER dependencies
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
  -- Always show generic teacher name for security
  'Преподаватель' as compact_teacher,
  -- Always hide group URLs for security
  NULL as "group_URL",
  "Возраст",
  vacancies,
  is_active,
  created_at,
  updated_at
FROM public.schedule
WHERE is_active = true;

-- Grant appropriate permissions
GRANT SELECT ON public.schedule_public TO anon;
GRANT SELECT ON public.schedule_public TO authenticated;

-- Update the RLS policies to be simpler and more secure
DROP POLICY IF EXISTS "Public can view limited schedule info" ON public.schedule;
DROP POLICY IF EXISTS "Admins can manage all schedule data" ON public.schedule;

-- Create a simple policy that prevents direct access to the schedule table
-- Users should use the schedule_public view instead
CREATE POLICY "No direct public access to schedule table"
ON public.schedule
FOR SELECT
USING (false);

-- Allow service role to manage schedule data (for admin operations)
CREATE POLICY "Service role can manage schedule"
ON public.schedule
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE public.schedule IS 'Internal schedule table. Use schedule_public view for safe public access.';
COMMENT ON VIEW public.schedule_public IS 'Public-safe view of schedule data with sensitive information (teacher names, group URLs) hidden.';

-- Note: The match_docs function with SECURITY DEFINER is kept as it's legitimately needed
-- for search functionality and follows security best practices by being read-only and specific.