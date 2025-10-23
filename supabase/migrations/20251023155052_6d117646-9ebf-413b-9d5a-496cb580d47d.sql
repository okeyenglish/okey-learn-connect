-- Fix unique constraints for proper upsert behavior

-- 1. Fix students: make external_id unique per organization
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_external_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS students_external_id_org_unique 
ON public.students(external_id, organization_id);

-- 2. Fix family_groups: add unique constraint for name per organization
CREATE UNIQUE INDEX IF NOT EXISTS family_groups_name_org_unique 
ON public.family_groups(name, organization_id);

-- 3. Ensure clients external_id is unique per organization
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_external_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS clients_external_id_org_unique 
ON public.clients(external_id, organization_id);