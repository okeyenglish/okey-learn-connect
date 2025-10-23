-- Create learning_types table for Holihope import

CREATE TABLE IF NOT EXISTS public.learning_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  organization_id UUID REFERENCES public.organizations(id),
  external_id TEXT,
  holihope_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint for upsert
CREATE UNIQUE INDEX IF NOT EXISTS learning_types_external_id_key 
ON public.learning_types(external_id) 
WHERE external_id IS NOT NULL;

-- Create index on organization
CREATE INDEX IF NOT EXISTS idx_learning_types_organization 
ON public.learning_types(organization_id);

-- Add RLS
ALTER TABLE public.learning_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and methodists can manage learning types"
ON public.learning_types
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role));

CREATE POLICY "Authenticated users can view learning types"
ON public.learning_types
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Add comments
COMMENT ON TABLE public.learning_types IS 'Reference table for learning types (индивидуальное, групповое, мини-группа, и т.д.)';
COMMENT ON COLUMN public.learning_types.external_id IS 'External ID from Holihope CRM';
COMMENT ON COLUMN public.learning_types.holihope_metadata IS 'Complete metadata from Holihope API';