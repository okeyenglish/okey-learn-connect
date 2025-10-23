-- Add external_id and organization_id to subjects table for Holihope integration

ALTER TABLE public.subjects 
ADD COLUMN IF NOT EXISTS external_id TEXT;

ALTER TABLE public.subjects 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Create unique constraint for upsert
CREATE UNIQUE INDEX IF NOT EXISTS subjects_external_id_org_key 
ON public.subjects(organization_id, external_id) 
WHERE external_id IS NOT NULL;

-- Add holihope_metadata for storing complete API data
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS holihope_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.subjects.external_id IS 'External ID from Holihope CRM';
COMMENT ON COLUMN public.subjects.holihope_metadata IS 'Complete metadata from Holihope API';