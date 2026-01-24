-- Remove the sso_audit_logs table from Cloud Supabase
-- SSO audit logs should only exist on self-hosted Supabase at api.academyos.ru
DROP TABLE IF EXISTS public.sso_audit_logs CASCADE;