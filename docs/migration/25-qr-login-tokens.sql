-- QR Login Tokens table for web login via mobile app scanning
-- Similar to WhatsApp Web / Telegram Web flow

-- Create table for QR login tokens
CREATE TABLE IF NOT EXISTS public.qr_login_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired', 'used')),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_data jsonb, -- stores access_token and refresh_token from mobile
  browser_info text, -- optional: user agent / fingerprint
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '2 minutes',
  confirmed_at timestamptz,
  used_at timestamptz
);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_qr_login_tokens_token ON public.qr_login_tokens(token);
CREATE INDEX IF NOT EXISTS idx_qr_login_tokens_status ON public.qr_login_tokens(status);
CREATE INDEX IF NOT EXISTS idx_qr_login_tokens_expires_at ON public.qr_login_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.qr_login_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can create a pending token (for web clients)
CREATE POLICY "Anyone can create pending QR tokens"
  ON public.qr_login_tokens
  FOR INSERT
  WITH CHECK (status = 'pending' AND user_id IS NULL);

-- Policy: Anyone can read pending tokens (for polling)
CREATE POLICY "Anyone can read pending QR tokens"
  ON public.qr_login_tokens
  FOR SELECT
  USING (status IN ('pending', 'confirmed'));

-- Policy: Authenticated users can confirm tokens (from mobile)
CREATE POLICY "Authenticated users can confirm QR tokens"
  ON public.qr_login_tokens
  FOR UPDATE
  USING (status = 'pending')
  WITH CHECK (auth.uid() = user_id);

-- Policy: System can update tokens (for expiration and used status)
CREATE POLICY "Service role can manage all tokens"
  ON public.qr_login_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to clean up expired tokens (can be called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_qr_tokens()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.qr_login_tokens
  WHERE expires_at < now()
    AND status = 'pending';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Also delete old used/expired tokens (older than 1 hour)
  DELETE FROM public.qr_login_tokens
  WHERE created_at < now() - interval '1 hour';
  
  RETURN deleted_count;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.cleanup_expired_qr_tokens() TO authenticated;

COMMENT ON TABLE public.qr_login_tokens IS 'Stores temporary tokens for QR code login flow (web login via mobile app)';
