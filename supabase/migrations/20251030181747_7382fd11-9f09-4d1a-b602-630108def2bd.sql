-- Add organization_id column to teacher_earnings table
ALTER TABLE public.teacher_earnings 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Set default value from function for new records
ALTER TABLE public.teacher_earnings 
ALTER COLUMN organization_id SET DEFAULT get_user_organization_id();

-- Update existing records to set organization_id from teacher's profile
UPDATE public.teacher_earnings te
SET organization_id = p.organization_id
FROM public.profiles p
WHERE te.teacher_id = p.id AND te.organization_id IS NULL;

-- Make it NOT NULL after updating existing records
ALTER TABLE public.teacher_earnings 
ALTER COLUMN organization_id SET NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_teacher_earnings_organization_id 
ON public.teacher_earnings(organization_id);