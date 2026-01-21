
-- Улучшить find_or_create_telegram_client: добавить нормализацию телефона и поиск по client_phone_numbers
-- Если клиент уже существует с полным именем (first_name/last_name) - НЕ перезаписываем имя из Telegram

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
  v_normalized_phone TEXT;
  v_has_full_name BOOLEAN;
BEGIN
  -- Normalize phone: remove all non-digits
  v_normalized_phone := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  
  -- Get advisory lock on combination of org + telegram_user to serialize concurrent requests
  PERFORM pg_advisory_xact_lock(hashtext(p_org_id::text || '_tg_' || p_telegram_user_id::text));
  
  -- PRIORITY 1: Find by telegram_user_id
  SELECT id INTO v_client_id
  FROM clients
  WHERE organization_id = p_org_id 
    AND telegram_user_id = p_telegram_user_id
    AND is_active = true
  LIMIT 1;
  
  IF v_client_id IS NOT NULL THEN
    UPDATE clients SET
      telegram_chat_id = COALESCE(p_telegram_chat_id, telegram_chat_id),
      telegram_avatar_url = COALESCE(p_avatar_url, telegram_avatar_url),
      last_message_at = NOW(),
      updated_at = NOW()
    WHERE id = v_client_id;
    RETURN v_client_id;
  END IF;
  
  -- PRIORITY 2: Find by telegram_chat_id
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
  
  -- PRIORITY 3: Find by phone (normalized, using LIKE for partial match)
  IF v_normalized_phone IS NOT NULL AND length(v_normalized_phone) >= 10 THEN
    -- Search in clients table by normalized phone (last 10 digits match)
    SELECT id INTO v_client_id
    FROM clients
    WHERE organization_id = p_org_id 
      AND is_active = true
      AND regexp_replace(COALESCE(phone, ''), '\D', '', 'g') LIKE '%' || right(v_normalized_phone, 10)
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
    
    -- PRIORITY 4: Search in client_phone_numbers table
    SELECT cpn.client_id INTO v_client_id
    FROM client_phone_numbers cpn
    JOIN clients c ON c.id = cpn.client_id
    WHERE c.organization_id = p_org_id
      AND c.is_active = true
      AND regexp_replace(cpn.phone, '\D', '', 'g') LIKE '%' || right(v_normalized_phone, 10)
    LIMIT 1;
    
    IF v_client_id IS NOT NULL THEN
      UPDATE clients SET
        telegram_user_id = p_telegram_user_id,
        telegram_chat_id = p_telegram_chat_id,
        telegram_avatar_url = COALESCE(p_avatar_url, telegram_avatar_url),
        phone = COALESCE(phone, v_normalized_phone), -- Only set phone if not already set
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
    v_normalized_phone, 
    true,
    NOW()
  )
  RETURNING id INTO v_client_id;
  
  RETURN v_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Also update enrichClientFromTelegram to NOT overwrite if client has structured name
CREATE OR REPLACE FUNCTION enrich_client_from_telegram(
  p_client_id UUID,
  p_contact_name TEXT,
  p_username TEXT,
  p_avatar_url TEXT,
  p_phone TEXT
) RETURNS VOID AS $$
DECLARE
  v_current_name TEXT;
  v_has_structured_name BOOLEAN;
BEGIN
  -- Check if client already has a proper name (first_name + last_name set, or name is not "Без имени"/phone-like)
  SELECT 
    name,
    (first_name IS NOT NULL AND first_name != '') OR 
    (last_name IS NOT NULL AND last_name != '') OR
    (name !~ '^\+?[0-9\s\-]+$' AND name NOT LIKE 'Без имени%' AND name NOT LIKE 'Telegram%' AND name NOT LIKE '@%' AND name NOT LIKE 'User %')
  INTO v_current_name, v_has_structured_name
  FROM clients
  WHERE id = p_client_id;
  
  -- If client already has a proper structured name, don't overwrite it
  IF v_has_structured_name THEN
    -- Only update avatar if provided
    IF p_avatar_url IS NOT NULL AND p_avatar_url != '' THEN
      UPDATE clients SET telegram_avatar_url = p_avatar_url, updated_at = NOW() WHERE id = p_client_id;
    END IF;
    RETURN;
  END IF;
  
  -- Otherwise, update name from Telegram data
  UPDATE clients SET
    name = COALESCE(NULLIF(p_contact_name, ''), COALESCE('@' || NULLIF(p_username, ''), name)),
    telegram_avatar_url = COALESCE(NULLIF(p_avatar_url, ''), telegram_avatar_url),
    phone = COALESCE(phone, NULLIF(regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g'), '')),
    updated_at = NOW()
  WHERE id = p_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION enrich_client_from_telegram TO authenticated;
GRANT EXECUTE ON FUNCTION enrich_client_from_telegram TO service_role;
