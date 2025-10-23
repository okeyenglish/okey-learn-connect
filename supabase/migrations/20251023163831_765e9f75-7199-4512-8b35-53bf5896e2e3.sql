-- Add missing fields for complete Holihope data storage

-- 1. Add external_id to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_leads_external_id ON public.leads(external_id);

-- 2. Add metadata field to students for storing ALL extra data from Holihope
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS holihope_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.students.holihope_metadata IS 'Complete metadata from Holihope API including ExtraFields, OfficesAndCompanies, and other raw data';

-- 3. Add metadata field to clients for storing ALL extra data
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS holihope_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.clients.holihope_metadata IS 'Complete metadata from Holihope API for agents/parents';

-- 4. Add metadata field to leads for storing ALL extra data  
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS holihope_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.leads.holihope_metadata IS 'Complete metadata from Holihope API';

-- 5. Add metadata field to teachers for storing ALL extra data
ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS holihope_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.teachers.holihope_metadata IS 'Complete metadata from Holihope API including categories, subjects, etc';