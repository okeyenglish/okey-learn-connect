-- Add subscription tier to organizations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE organizations 
    ADD COLUMN subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'paid'));
  END IF;
END $$;

-- Update ai_provider_keys to support tier-based models
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_provider_keys' AND column_name = 'key_type'
  ) THEN
    ALTER TABLE ai_provider_keys 
    ADD COLUMN key_type TEXT NOT NULL DEFAULT 'free' CHECK (key_type IN ('free', 'byok'));
  END IF;
END $$;

-- Update provisioning function to respect tier
CREATE OR REPLACE FUNCTION get_organization_ai_limit(p_organization_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_tier TEXT;
  v_limit INTEGER;
BEGIN
  SELECT subscription_tier INTO v_tier
  FROM organizations
  WHERE id = p_organization_id;
  
  -- Free tier: 50 requests with :free models
  -- Paid tier: 1000 requests with BYOK models
  IF v_tier = 'paid' THEN
    v_limit := 1000;
  ELSE
    v_limit := 50;
  END IF;
  
  RETURN v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create model mapping table
CREATE TABLE IF NOT EXISTS ai_model_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case TEXT NOT NULL CHECK (use_case IN ('lesson_plan', 'coder')),
  tier TEXT NOT NULL CHECK (tier IN ('free', 'paid')),
  model_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(use_case, tier)
);

-- Insert default model mappings
INSERT INTO ai_model_mappings (use_case, tier, model_id) VALUES
  ('lesson_plan', 'free', 'deepseek/deepseek-chat:free'),
  ('lesson_plan', 'paid', 'deepseek/deepseek-chat'),
  ('coder', 'free', 'qwen/qwen2.5-coder:1.5b:free'),
  ('coder', 'paid', 'qwen/qwen2.5-coder:7b-instruct')
ON CONFLICT (use_case, tier) DO NOTHING;

-- Function to resolve model based on tier and use case
CREATE OR REPLACE FUNCTION resolve_ai_model(
  p_organization_id UUID,
  p_use_case TEXT DEFAULT 'lesson_plan'
)
RETURNS TEXT AS $$
DECLARE
  v_tier TEXT;
  v_model TEXT;
BEGIN
  -- Get organization tier
  SELECT subscription_tier INTO v_tier
  FROM organizations
  WHERE id = p_organization_id;
  
  -- Get corresponding model
  SELECT model_id INTO v_model
  FROM ai_model_mappings
  WHERE use_case = p_use_case
    AND tier = v_tier
    AND is_active = true;
  
  -- Fallback to free tier model if not found
  IF v_model IS NULL THEN
    SELECT model_id INTO v_model
    FROM ai_model_mappings
    WHERE use_case = p_use_case
      AND tier = 'free'
      AND is_active = true;
  END IF;
  
  RETURN COALESCE(v_model, 'google/gemini-2.0-flash-exp:free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for easy access to organization AI settings
CREATE OR REPLACE VIEW v_organization_ai_settings AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  o.subscription_tier,
  get_organization_ai_limit(o.id) as ai_limit,
  k.key_type,
  k.limit_remaining,
  k.limit_monthly,
  k.status as key_status
FROM organizations o
LEFT JOIN ai_provider_keys k ON k.organization_id = o.id AND k.provider = 'openrouter';

-- Grant access
GRANT SELECT ON v_organization_ai_settings TO authenticated;