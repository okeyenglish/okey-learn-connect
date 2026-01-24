-- Create SSO audit logs table for security tracking
CREATE TABLE public.sso_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'encrypt', 'decrypt', 'error'
  user_id UUID, -- User performing the action (if authenticated)
  ip_address TEXT,
  user_agent TEXT,
  source_domain TEXT, -- Origin domain
  target_domain TEXT, -- Target redirect domain
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for querying by user and time
CREATE INDEX idx_sso_audit_logs_user_id ON public.sso_audit_logs(user_id);
CREATE INDEX idx_sso_audit_logs_created_at ON public.sso_audit_logs(created_at DESC);
CREATE INDEX idx_sso_audit_logs_event_type ON public.sso_audit_logs(event_type);

-- Enable RLS
ALTER TABLE public.sso_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert logs
CREATE POLICY "Authenticated users can log SSO events"
  ON public.sso_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anon to insert logs (for decrypt which is public)
CREATE POLICY "Public can log SSO events"
  ON public.sso_audit_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Users can read their own logs
CREATE POLICY "Users can read own SSO audit logs"
  ON public.sso_audit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Add comment for documentation
COMMENT ON TABLE public.sso_audit_logs IS 'Audit trail for SSO authentication events between domains';