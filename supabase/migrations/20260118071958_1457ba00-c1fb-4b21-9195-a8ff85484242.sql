-- Add holihope_metadata column to learning_groups table if not exists
ALTER TABLE public.learning_groups 
ADD COLUMN IF NOT EXISTS holihope_metadata jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.learning_groups.holihope_metadata IS 'Full metadata from HoliHope API including external IDs for quick reference links';