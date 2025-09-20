-- Create admin user role for the admin account
-- First, we need to manually create the user in Supabase Auth
-- Email: admin@okeyenglish.ru
-- Password: OkeyAdmin2024!

-- This migration will ensure admin role is assigned
-- Note: The user must be created first through Supabase Auth interface

-- Insert admin role (will be applied when user is created)
INSERT INTO public.user_roles (user_id, role)
SELECT 
  id,
  'admin'::app_role
FROM auth.users 
WHERE email = 'admin@okeyenglish.ru'
ON CONFLICT (user_id, role) DO NOTHING;