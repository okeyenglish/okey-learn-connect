-- Transfer employees from teachers table to employees table
INSERT INTO public.employees (
  first_name, last_name, email, phone, position, branch, 
  is_active, external_id, holihope_metadata, created_at
)
SELECT 
  first_name, 
  last_name, 
  email, 
  phone, 
  holihope_metadata->>'Position' as position,
  branch, 
  is_active, 
  external_id, 
  holihope_metadata,
  created_at
FROM public.teachers
WHERE holihope_metadata->>'Position' IS NOT NULL
ON CONFLICT (external_id) DO NOTHING;

-- Remove employees from teachers table
DELETE FROM public.teachers
WHERE holihope_metadata->>'Position' IS NOT NULL;