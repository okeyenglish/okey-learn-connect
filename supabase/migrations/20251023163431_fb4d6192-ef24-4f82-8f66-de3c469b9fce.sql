-- Add holihope_id column to organization_branches for Holihope integration
-- This will store the external office ID from Holihope CRM

ALTER TABLE public.organization_branches 
ADD COLUMN IF NOT EXISTS holihope_id INTEGER;

-- Create unique constraint to prevent duplicate imports
ALTER TABLE public.organization_branches 
ADD CONSTRAINT organization_branches_holihope_id_key 
UNIQUE (organization_id, holihope_id);