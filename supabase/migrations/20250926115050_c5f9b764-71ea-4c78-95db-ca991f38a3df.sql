-- Create role_permissions table if it doesn't exist and add permissions for admin role

-- Create role_permissions table  
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role app_role NOT NULL,
  permission TEXT NOT NULL,
  resource TEXT NOT NULL,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_read BOOLEAN NOT NULL DEFAULT false, 
  can_update BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, permission, resource)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Add policy for viewing role permissions
CREATE POLICY "Authenticated users can view role permissions"
ON public.role_permissions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Add admin permissions - full access to everything
INSERT INTO public.role_permissions (role, permission, resource, can_create, can_read, can_update, can_delete) 
VALUES 
  ('admin', 'manage', 'all', true, true, true, true),
  ('admin', 'manage', 'users', true, true, true, true),
  ('admin', 'manage', 'roles', true, true, true, true),
  ('admin', 'manage', 'clients', true, true, true, true),
  ('admin', 'manage', 'schedules', true, true, true, true),
  ('admin', 'manage', 'groups', true, true, true, true),
  ('admin', 'view', 'reports', false, true, false, false)
ON CONFLICT (role, permission, resource) DO NOTHING;

-- Add manager permissions
INSERT INTO public.role_permissions (role, permission, resource, can_create, can_read, can_update, can_delete) 
VALUES 
  ('manager', 'manage', 'clients', true, true, true, false),
  ('manager', 'manage', 'schedules', true, true, true, false),
  ('manager', 'view', 'reports', false, true, false, false)
ON CONFLICT (role, permission, resource) DO NOTHING;