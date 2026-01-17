-- Enable RLS on ai_model_mappings table (the only table without RLS)
ALTER TABLE public.ai_model_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_model_mappings
-- This is a lookup/configuration table - allow public SELECT for active mappings
CREATE POLICY "Anyone can view active AI model mappings" 
ON public.ai_model_mappings 
FOR SELECT 
USING (is_active = true);

-- Only service role (backend) can manage model mappings
-- No INSERT/UPDATE/DELETE policies for regular users

-- Fix messenger_settings RLS - make it more restrictive for token access
-- Drop existing overly permissive policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their organization messenger settings" ON public.messenger_settings;
  DROP POLICY IF EXISTS "Admins can manage messenger settings" ON public.messenger_settings;
  DROP POLICY IF EXISTS "Service role can manage messenger settings" ON public.messenger_settings;
  DROP POLICY IF EXISTS "Users can view own organization settings" ON public.messenger_settings;
  DROP POLICY IF EXISTS "Organization members can view messenger settings" ON public.messenger_settings;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new restrictive policies for messenger_settings
-- Only organization admins can view settings with API tokens
CREATE POLICY "Organization admins can view messenger settings" 
ON public.messenger_settings 
FOR SELECT 
USING (
  organization_id IN (
    SELECT p.organization_id 
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid()
      AND ur.role = 'admin'
  )
);

-- Only organization admins can modify settings
CREATE POLICY "Organization admins can insert messenger settings" 
ON public.messenger_settings 
FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT p.organization_id 
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid()
      AND ur.role = 'admin'
  )
);

CREATE POLICY "Organization admins can update messenger settings" 
ON public.messenger_settings 
FOR UPDATE 
USING (
  organization_id IN (
    SELECT p.organization_id 
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid()
      AND ur.role = 'admin'
  )
);

CREATE POLICY "Organization admins can delete messenger settings" 
ON public.messenger_settings 
FOR DELETE 
USING (
  organization_id IN (
    SELECT p.organization_id 
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid()
      AND ur.role = 'admin'
  )
);