-- Create organization_balances table
CREATE TABLE organization_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency_id UUID REFERENCES currencies(id),
  total_topped_up DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_spent DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_org_balance_org ON organization_balances(organization_id);

-- Create organization_balance_transactions table
CREATE TABLE organization_balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('topup', 'ai_usage', 'refund', 'adjustment')),
  currency_id UUID REFERENCES currencies(id),
  description TEXT,
  ai_requests_count INTEGER,
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_org_balance_txns_org ON organization_balance_transactions(organization_id);
CREATE INDEX idx_org_balance_txns_type ON organization_balance_transactions(transaction_type);
CREATE INDEX idx_org_balance_txns_created ON organization_balance_transactions(created_at DESC);

-- Create ai_pricing table
CREATE TABLE ai_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model_name TEXT,
  price_per_request DECIMAL(10,4) NOT NULL,
  currency_id UUID REFERENCES currencies(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider, model_name)
);

-- Insert default pricing
INSERT INTO ai_pricing (provider, model_name, price_per_request, currency_id)
VALUES 
  ('openrouter', NULL, 0.10, (SELECT id FROM currencies WHERE code = 'RUB' LIMIT 1)),
  ('gateway', NULL, 0.05, (SELECT id FROM currencies WHERE code = 'RUB' LIMIT 1));

-- Function to automatically create balance for new organizations
CREATE OR REPLACE FUNCTION create_organization_balance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organization_balances (organization_id, currency_id)
  VALUES (NEW.id, (SELECT id FROM currencies WHERE is_default = true LIMIT 1))
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_create_org_balance
AFTER INSERT ON organizations
FOR EACH ROW
EXECUTE FUNCTION create_organization_balance();

-- Backfill balances for existing organizations
INSERT INTO organization_balances (organization_id, currency_id)
SELECT id, (SELECT id FROM currencies WHERE is_default = true LIMIT 1)
FROM organizations
ON CONFLICT (organization_id) DO NOTHING;

-- RPC function to top up organization balance
CREATE OR REPLACE FUNCTION topup_organization_balance(
  p_organization_id UUID,
  p_amount DECIMAL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_currency_id UUID;
BEGIN
  -- Get organization's currency
  SELECT currency_id INTO v_currency_id
  FROM organization_balances
  WHERE organization_id = p_organization_id;

  IF v_currency_id IS NULL THEN
    RAISE EXCEPTION 'Organization balance not found';
  END IF;

  -- Update balance
  UPDATE organization_balances
  SET 
    balance = balance + p_amount,
    total_topped_up = total_topped_up + p_amount,
    updated_at = now()
  WHERE organization_id = p_organization_id;

  -- Create transaction record
  INSERT INTO organization_balance_transactions (
    organization_id,
    amount,
    transaction_type,
    currency_id,
    description,
    created_by
  ) VALUES (
    p_organization_id,
    p_amount,
    'topup',
    v_currency_id,
    COALESCE(p_description, 'Balance top-up'),
    auth.uid()
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to charge for AI usage
CREATE OR REPLACE FUNCTION charge_ai_usage(
  p_organization_id UUID,
  p_provider TEXT,
  p_model TEXT DEFAULT NULL,
  p_requests_count INTEGER DEFAULT 1,
  p_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_price_per_request DECIMAL;
  v_total_charge DECIMAL;
  v_current_balance DECIMAL;
  v_currency_id UUID;
BEGIN
  -- Get price per request
  SELECT price_per_request INTO v_price_per_request
  FROM ai_pricing
  WHERE provider = p_provider 
    AND (model_name = p_model OR model_name IS NULL)
    AND is_active = true
  ORDER BY (model_name IS NOT NULL) DESC, created_at DESC
  LIMIT 1;

  IF v_price_per_request IS NULL THEN
    v_price_per_request := 0.10; -- Fallback default price
  END IF;

  v_total_charge := v_price_per_request * p_requests_count;

  -- Check sufficient balance
  SELECT balance, currency_id INTO v_current_balance, v_currency_id
  FROM organization_balances
  WHERE organization_id = p_organization_id;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'Organization balance not found';
  END IF;

  IF v_current_balance < v_total_charge THEN
    RETURN FALSE; -- Insufficient funds
  END IF;

  -- Deduct funds
  UPDATE organization_balances
  SET 
    balance = balance - v_total_charge,
    total_spent = total_spent + v_total_charge,
    updated_at = now()
  WHERE organization_id = p_organization_id;

  -- Create transaction record
  INSERT INTO organization_balance_transactions (
    organization_id,
    amount,
    transaction_type,
    currency_id,
    description,
    ai_requests_count,
    metadata
  ) VALUES (
    p_organization_id,
    -v_total_charge,
    'ai_usage',
    v_currency_id,
    'AI usage: ' || p_provider || COALESCE(' (' || p_model || ')', ''),
    p_requests_count,
    p_metadata
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies for organization_balances
ALTER TABLE organization_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_org_balance_view ON organization_balances
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY p_org_balance_admin_manage ON organization_balances
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for organization_balance_transactions
ALTER TABLE organization_balance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_org_txns_view ON organization_balance_transactions
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY p_org_txns_admin_manage ON organization_balance_transactions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for ai_pricing
ALTER TABLE ai_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_ai_pricing_view ON ai_pricing
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY p_ai_pricing_admin_manage ON ai_pricing
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));