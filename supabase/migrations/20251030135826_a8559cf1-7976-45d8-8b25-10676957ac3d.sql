-- Clean up old conflicting policies on leads table
DROP POLICY IF EXISTS "admin_all_leads" ON public.leads;
DROP POLICY IF EXISTS "auth_view_leads" ON public.leads;
DROP POLICY IF EXISTS "managers_branch_leads" ON public.leads;
DROP POLICY IF EXISTS "service_leads" ON public.leads;

-- Ensure RLS is enabled
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_branches ENABLE ROW LEVEL SECURITY;