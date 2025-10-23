-- Add external_id and organization_id to proficiency_levels table for Holihope integration

ALTER TABLE public.proficiency_levels 
ADD COLUMN IF NOT EXISTS external_id TEXT;

ALTER TABLE public.proficiency_levels 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Create unique constraint for upsert
CREATE UNIQUE INDEX IF NOT EXISTS proficiency_levels_external_id_org_key 
ON public.proficiency_levels(organization_id, external_id) 
WHERE external_id IS NOT NULL;

-- Add holihope_metadata for storing complete API data
ALTER TABLE public.proficiency_levels
ADD COLUMN IF NOT EXISTS holihope_metadata JSONB DEFAULT '{}'::jsonb;

-- Add subject field to track which subject this level belongs to
ALTER TABLE public.proficiency_levels
ADD COLUMN IF NOT EXISTS subject TEXT;

COMMENT ON COLUMN public.proficiency_levels.external_id IS 'External ID from Holihope CRM';
COMMENT ON COLUMN public.proficiency_levels.holihope_metadata IS 'Complete metadata from Holihope API including disciplines';
COMMENT ON COLUMN public.proficiency_levels.subject IS 'Subject/discipline this level applies to';