-- Step 1: Merge all Telegram duplicate clients before creating unique index
-- For each group of duplicates, keep the oldest one and merge messages from others

-- Merge ROS duplicates (telegram_user_id = 6079475708)
-- Primary: f884cdc6-05b1-4565-890c-c33f744ee4e4
UPDATE chat_messages 
SET client_id = 'f884cdc6-05b1-4565-890c-c33f744ee4e4'
WHERE client_id IN (
  'd0c6f28a-d2de-478a-90a3-f57bfd77a5ed',
  '2c69edfb-02b4-43a5-b3c3-479006bfbec1',
  '6dd2a54e-91b0-45d5-93e4-8ae6f52faece',
  '0456bada-0162-4264-a74b-3a2978be61c2',
  '5c7a1f26-94e2-4779-9575-7c2cfe5568de'
);

UPDATE client_phone_numbers 
SET client_id = 'f884cdc6-05b1-4565-890c-c33f744ee4e4'
WHERE client_id IN (
  'd0c6f28a-d2de-478a-90a3-f57bfd77a5ed',
  '2c69edfb-02b4-43a5-b3c3-479006bfbec1',
  '6dd2a54e-91b0-45d5-93e4-8ae6f52faece',
  '0456bada-0162-4264-a74b-3a2978be61c2',
  '5c7a1f26-94e2-4779-9575-7c2cfe5568de'
);

UPDATE clients 
SET is_active = false, 
    notes = COALESCE(notes, '') || ' [Merged - telegram duplicate of f884cdc6]'
WHERE id IN (
  'd0c6f28a-d2de-478a-90a3-f57bfd77a5ed',
  '2c69edfb-02b4-43a5-b3c3-479006bfbec1',
  '6dd2a54e-91b0-45d5-93e4-8ae6f52faece',
  '0456bada-0162-4264-a74b-3a2978be61c2',
  '5c7a1f26-94e2-4779-9575-7c2cfe5568de'
);

-- Merge Darya duplicates (telegram_user_id = 953349620)
-- Primary: a389dc24-bcfd-4794-8468-9cfa840b2a82
UPDATE chat_messages 
SET client_id = 'a389dc24-bcfd-4794-8468-9cfa840b2a82'
WHERE client_id = '70a8c118-6987-406b-a648-bc6b00b6c15e';

UPDATE client_phone_numbers 
SET client_id = 'a389dc24-bcfd-4794-8468-9cfa840b2a82'
WHERE client_id = '70a8c118-6987-406b-a648-bc6b00b6c15e';

UPDATE clients 
SET is_active = false, 
    notes = COALESCE(notes, '') || ' [Merged - telegram duplicate of a389dc24]'
WHERE id = '70a8c118-6987-406b-a648-bc6b00b6c15e';

-- Step 2: Now create the unique index (will succeed after duplicates are resolved)
CREATE UNIQUE INDEX IF NOT EXISTS clients_org_telegram_user_unique 
ON clients(organization_id, telegram_user_id) 
WHERE telegram_user_id IS NOT NULL AND is_active = true;

-- Step 3: Create RPC function to find or create Telegram client with advisory lock
CREATE OR REPLACE FUNCTION find_or_create_telegram_client(
  p_org_id UUID,
  p_telegram_user_id BIGINT,
  p_telegram_chat_id TEXT,
  p_name TEXT,
  p_username TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_client_id UUID;
BEGIN
  -- Get advisory lock on combination of org + telegram_user to serialize concurrent requests
  PERFORM pg_advisory_xact_lock(hashtext(p_org_id::text || '_tg_' || p_telegram_user_id::text));
  
  -- First, try to find existing client by telegram_user_id
  SELECT id INTO v_client_id
  FROM clients
  WHERE organization_id = p_org_id 
    AND telegram_user_id = p_telegram_user_id
    AND is_active = true
  LIMIT 1;
  
  -- If found - update and return
  IF v_client_id IS NOT NULL THEN
    UPDATE clients SET
      telegram_chat_id = COALESCE(p_telegram_chat_id, telegram_chat_id),
      telegram_avatar_url = COALESCE(p_avatar_url, telegram_avatar_url),
      last_message_at = NOW(),
      updated_at = NOW()
    WHERE id = v_client_id;
    RETURN v_client_id;
  END IF;
  
  -- If not found by telegram_user_id, try to find by telegram_chat_id
  SELECT id INTO v_client_id
  FROM clients
  WHERE organization_id = p_org_id 
    AND telegram_chat_id = p_telegram_chat_id
    AND is_active = true
  LIMIT 1;
  
  IF v_client_id IS NOT NULL THEN
    UPDATE clients SET
      telegram_user_id = p_telegram_user_id,
      telegram_avatar_url = COALESCE(p_avatar_url, telegram_avatar_url),
      last_message_at = NOW(),
      updated_at = NOW()
    WHERE id = v_client_id;
    RETURN v_client_id;
  END IF;
  
  -- Try to find by phone number if provided
  IF p_phone IS NOT NULL AND p_phone != '' THEN
    SELECT id INTO v_client_id
    FROM clients
    WHERE organization_id = p_org_id 
      AND phone = p_phone
      AND is_active = true
    LIMIT 1;
    
    IF v_client_id IS NOT NULL THEN
      UPDATE clients SET
        telegram_user_id = p_telegram_user_id,
        telegram_chat_id = p_telegram_chat_id,
        telegram_avatar_url = COALESCE(p_avatar_url, telegram_avatar_url),
        last_message_at = NOW(),
        updated_at = NOW()
      WHERE id = v_client_id;
      RETURN v_client_id;
    END IF;
  END IF;
  
  -- Create new client
  INSERT INTO clients (
    organization_id, 
    name, 
    telegram_user_id, 
    telegram_chat_id, 
    telegram_avatar_url, 
    phone, 
    is_active,
    last_message_at
  )
  VALUES (
    p_org_id, 
    p_name, 
    p_telegram_user_id, 
    p_telegram_chat_id, 
    p_avatar_url, 
    p_phone, 
    true,
    NOW()
  )
  RETURNING id INTO v_client_id;
  
  RETURN v_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION find_or_create_telegram_client TO authenticated;
GRANT EXECUTE ON FUNCTION find_or_create_telegram_client TO service_role;