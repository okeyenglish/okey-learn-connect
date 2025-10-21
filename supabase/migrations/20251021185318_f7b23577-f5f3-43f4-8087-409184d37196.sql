-- Add family_group_id to leads table
ALTER TABLE public.leads 
ADD COLUMN family_group_id UUID REFERENCES public.family_groups(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_family_group_id ON public.leads(family_group_id);

COMMENT ON COLUMN public.leads.family_group_id IS 'Reference to family group for linking lead to contacts';