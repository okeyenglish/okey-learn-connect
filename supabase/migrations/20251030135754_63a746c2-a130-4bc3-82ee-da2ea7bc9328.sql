-- Add organization_id to leads table (nullable first)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Update all existing leads with default organization ID
UPDATE public.leads 
SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

-- Now make it NOT NULL with default
ALTER TABLE public.leads 
ALTER COLUMN organization_id SET NOT NULL,
ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON public.leads(organization_id);

-- Add organization_id to lead_sources table (nullable first)
ALTER TABLE public.lead_sources 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Update existing lead_sources
UPDATE public.lead_sources 
SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

-- Now make it NOT NULL
ALTER TABLE public.lead_sources 
ALTER COLUMN organization_id SET NOT NULL,
ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

-- Add index
CREATE INDEX IF NOT EXISTS idx_lead_sources_organization_id ON public.lead_sources(organization_id);

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view leads in their organization" ON public.leads;
DROP POLICY IF EXISTS "Users can manage leads in their organization" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Admins and managers can manage leads" ON public.leads;
DROP POLICY IF EXISTS "open_leads_delete" ON public.leads;
DROP POLICY IF EXISTS "open_leads_insert" ON public.leads;
DROP POLICY IF EXISTS "open_leads_select" ON public.leads;
DROP POLICY IF EXISTS "open_leads_update" ON public.leads;

-- Create RLS policies for leads table
CREATE POLICY "Users can view leads in their organization"
ON public.leads
FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage leads in their organization"
ON public.leads
FOR ALL
USING (
  (organization_id = get_user_organization_id()) 
  AND (auth.uid() IS NOT NULL)
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'sales_manager'::app_role)
    OR has_role(auth.uid(), 'marketing_manager'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
)
WITH CHECK (
  (organization_id = get_user_organization_id()) 
  AND (auth.uid() IS NOT NULL)
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'sales_manager'::app_role)
    OR has_role(auth.uid(), 'marketing_manager'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);

-- Update lead_sources policies
DROP POLICY IF EXISTS "Users can view lead sources" ON public.lead_sources;
DROP POLICY IF EXISTS "Admins can manage lead sources" ON public.lead_sources;
DROP POLICY IF EXISTS "Authenticated users can view lead sources" ON public.lead_sources;

CREATE POLICY "Users can view lead sources in their organization"
ON public.lead_sources
FOR SELECT
USING (
  (organization_id = get_user_organization_id()) 
  OR (organization_id IS NULL)
);

CREATE POLICY "Admins can manage lead sources"
ON public.lead_sources
FOR ALL
USING (
  (organization_id = get_user_organization_id() OR organization_id IS NULL)
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role))
)
WITH CHECK (
  (organization_id = get_user_organization_id() OR organization_id IS NULL)
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role))
);

-- Update lead_statuses policies (they already have organization_id)
DROP POLICY IF EXISTS "Users can view lead statuses" ON public.lead_statuses;
DROP POLICY IF EXISTS "Admins can manage lead statuses" ON public.lead_statuses;
DROP POLICY IF EXISTS "Authenticated users can view lead statuses" ON public.lead_statuses;

CREATE POLICY "Users can view lead statuses in their organization"
ON public.lead_statuses
FOR SELECT
USING (
  (organization_id = get_user_organization_id()) 
  OR (organization_id IS NULL)
);

CREATE POLICY "Admins can manage lead statuses"
ON public.lead_statuses
FOR ALL
USING (
  (organization_id = get_user_organization_id() OR organization_id IS NULL)
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role))
)
WITH CHECK (
  (organization_id = get_user_organization_id() OR organization_id IS NULL)
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role))
);

-- Update lead_status_history policies
DROP POLICY IF EXISTS "Users can view lead status history" ON public.lead_status_history;
DROP POLICY IF EXISTS "Users can manage lead status history" ON public.lead_status_history;

CREATE POLICY "Users can view lead status history in their organization"
ON public.lead_status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = lead_status_history.lead_id 
    AND leads.organization_id = get_user_organization_id()
  )
);

CREATE POLICY "Users can manage lead status history"
ON public.lead_status_history
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = lead_status_history.lead_id 
    AND leads.organization_id = get_user_organization_id()
  )
  AND (auth.uid() IS NOT NULL)
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = lead_status_history.lead_id 
    AND leads.organization_id = get_user_organization_id()
  )
  AND (auth.uid() IS NOT NULL)
);

-- Update lead_branches policies
DROP POLICY IF EXISTS "Users can view lead branches" ON public.lead_branches;
DROP POLICY IF EXISTS "Users can manage lead branches" ON public.lead_branches;

CREATE POLICY "Users can view lead branches in their organization"
ON public.lead_branches
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = lead_branches.lead_id 
    AND leads.organization_id = get_user_organization_id()
  )
);

CREATE POLICY "Users can manage lead branches"
ON public.lead_branches
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = lead_branches.lead_id 
    AND leads.organization_id = get_user_organization_id()
  )
  AND (auth.uid() IS NOT NULL)
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = lead_branches.lead_id 
    AND leads.organization_id = get_user_organization_id()
  )
  AND (auth.uid() IS NOT NULL)
);

COMMENT ON COLUMN public.leads.organization_id IS 'Organization ID for multi-tenancy isolation';
COMMENT ON COLUMN public.lead_sources.organization_id IS 'Organization ID for multi-tenancy isolation';