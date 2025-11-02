-- Drop old charge_ai_usage function and recreate with correct signature
DROP FUNCTION IF EXISTS charge_ai_usage(UUID, TEXT, TEXT, INTEGER, JSONB);

CREATE OR REPLACE FUNCTION charge_ai_usage(
  p_organization_id UUID,
  p_provider TEXT,
  p_model TEXT,
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
  -- Get price per request for the model
  SELECT price_per_request INTO v_price_per_request
  FROM ai_pricing
  WHERE provider = p_provider 
    AND (model_name = p_model OR model_name IS NULL)
    AND is_active = true
  ORDER BY model_name DESC NULLS LAST
  LIMIT 1;

  IF v_price_per_request IS NULL THEN
    v_price_per_request := 0.10; -- Fallback
  END IF;

  v_total_charge := v_price_per_request * p_requests_count;

  -- Check if balance is sufficient
  SELECT balance, currency_id INTO v_current_balance, v_currency_id
  FROM organization_balances
  WHERE organization_id = p_organization_id;

  IF v_current_balance IS NULL THEN
    RETURN FALSE; -- Organization has no balance record
  END IF;

  IF v_current_balance < v_total_charge THEN
    RETURN FALSE; -- Insufficient funds
  END IF;

  -- Charge the balance
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
    'AI usage: ' || p_provider || '/' || p_model,
    p_requests_count,
    p_metadata
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;