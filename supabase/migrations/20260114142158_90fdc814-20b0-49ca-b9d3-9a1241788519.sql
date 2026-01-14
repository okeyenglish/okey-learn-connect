-- Add organization_id column to messenger_settings for multi-tenant isolation
ALTER TABLE public.messenger_settings 
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create unique constraint for organization + messenger_type
ALTER TABLE public.messenger_settings 
DROP CONSTRAINT IF EXISTS messenger_settings_messenger_type_key;

ALTER TABLE public.messenger_settings 
ADD CONSTRAINT messenger_settings_org_type_unique UNIQUE (organization_id, messenger_type);

-- Enable RLS
ALTER TABLE public.messenger_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their organization settings" ON public.messenger_settings;
DROP POLICY IF EXISTS "Users can insert their organization settings" ON public.messenger_settings;
DROP POLICY IF EXISTS "Users can update their organization settings" ON public.messenger_settings;
DROP POLICY IF EXISTS "Users can delete their organization settings" ON public.messenger_settings;

-- Create RLS policies for organization isolation
CREATE POLICY "Users can view their organization settings"
ON public.messenger_settings
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert their organization settings"
ON public.messenger_settings
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their organization settings"
ON public.messenger_settings
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete their organization settings"
ON public.messenger_settings
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);