-- ============================================
-- Обновление RPC find_or_create_telegram_client
-- Приоритизация активных клиентов + автореактивация
-- Выполнить на self-hosted Supabase (api.academyos.ru)
-- ============================================

CREATE OR REPLACE FUNCTION public.find_or_create_telegram_client(
  p_telegram_user_id TEXT,
  p_phone TEXT,
  p_name TEXT,
  p_organization_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_inactive_client_id UUID;
  v_active_dup_id UUID;
  v_normalized_phone TEXT;
  v_valid_phone TEXT;
  v_inactive_phone TEXT;
BEGIN
  -- Нормализуем телефон (только цифры, последние 10)
  IF p_phone IS NOT NULL AND p_phone != '' THEN
    v_normalized_phone := right(regexp_replace(p_phone, '\D', '', 'g'), 10);
    
    -- Проверяем валидность - если это Telegram ID, не сохраняем как телефон
    IF is_valid_phone_number(p_phone) THEN
      v_valid_phone := p_phone;
    ELSE
      v_valid_phone := NULL;
      RAISE NOTICE 'Phone % rejected as invalid (likely Telegram ID)', p_phone;
    END IF;
  END IF;
  
  -- ШАГ 1: Ищем АКТИВНОГО клиента по telegram_user_id
  SELECT id INTO v_client_id
  FROM clients
  WHERE telegram_user_id = p_telegram_user_id
    AND organization_id = p_organization_id
    AND is_active = true
  LIMIT 1;
  
  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;
  
  -- ШАГ 2: Ищем ЛЮБОГО клиента (включая неактивных) по telegram_user_id
  SELECT id, phone INTO v_inactive_client_id, v_inactive_phone
  FROM clients
  WHERE telegram_user_id = p_telegram_user_id
    AND organization_id = p_organization_id
  LIMIT 1;
  
  IF v_inactive_client_id IS NOT NULL THEN
    -- Нашли неактивного — проверяем есть ли активный дубликат по телефону
    IF v_inactive_phone IS NOT NULL AND length(regexp_replace(v_inactive_phone, '\D', '', 'g')) >= 10 THEN
      SELECT id INTO v_active_dup_id
      FROM clients
      WHERE organization_id = p_organization_id
        AND is_active = true
        AND id != v_inactive_client_id
        AND right(regexp_replace(phone, '\D', '', 'g'), 10) = right(regexp_replace(v_inactive_phone, '\D', '', 'g'), 10)
      LIMIT 1;
    END IF;
    
    IF v_active_dup_id IS NOT NULL THEN
      -- Есть активный дубликат: переносим telegram_user_id на него
      UPDATE clients 
      SET telegram_user_id = p_telegram_user_id, updated_at = now()
      WHERE id = v_active_dup_id;
      
      -- Очищаем telegram данные у неактивного
      UPDATE clients 
      SET telegram_user_id = NULL, telegram_chat_id = NULL, updated_at = now()
      WHERE id = v_inactive_client_id;
      
      RAISE NOTICE 'Transferred telegram_user_id to active duplicate %', v_active_dup_id;
      RETURN v_active_dup_id;
    ELSE
      -- Нет активного дубликата: реактивируем
      UPDATE clients 
      SET is_active = true, status = 'active', updated_at = now()
      WHERE id = v_inactive_client_id;
      
      RAISE NOTICE 'Reactivated inactive client %', v_inactive_client_id;
      RETURN v_inactive_client_id;
    END IF;
  END IF;
  
  -- ШАГ 3: Ищем АКТИВНОГО клиента по нормализованному телефону (если валидный)
  IF v_normalized_phone IS NOT NULL AND length(v_normalized_phone) = 10 AND v_valid_phone IS NOT NULL THEN
    SELECT id INTO v_client_id
    FROM clients
    WHERE organization_id = p_organization_id
      AND is_active = true
      AND (
        right(regexp_replace(phone, '\D', '', 'g'), 10) = v_normalized_phone
        OR right(regexp_replace(whatsapp_id, '\D', '', 'g'), 10) = v_normalized_phone
      )
    LIMIT 1;
    
    IF v_client_id IS NOT NULL THEN
      -- Обновляем telegram_user_id
      UPDATE clients
      SET telegram_user_id = p_telegram_user_id,
          updated_at = now()
      WHERE id = v_client_id;
      
      RETURN v_client_id;
    END IF;
  END IF;
  
  -- ШАГ 4: Создаём нового клиента
  INSERT INTO clients (
    organization_id,
    telegram_user_id,
    phone,
    name,
    source,
    is_active
  ) VALUES (
    p_organization_id,
    p_telegram_user_id,
    v_valid_phone,
    COALESCE(NULLIF(trim(p_name), ''), 'Telegram ' || left(p_telegram_user_id, 8)),
    'telegram',
    true
  )
  RETURNING id INTO v_client_id;
  
  RETURN v_client_id;
END;
$$;

-- ============================================
-- Проверка
-- ============================================
-- Тест: вызвать с telegram_user_id существующего неактивного клиента
-- SELECT find_or_create_telegram_client('374235301', NULL, 'Test', '<org_id>');
-- Должен вернуть ID активного клиента (реактивированного или дубликата)
