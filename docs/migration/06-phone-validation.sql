-- ============================================
-- Валидация телефонных номеров
-- Выполнить на self-hosted Supabase (api.academyos.ru)
-- ============================================

-- 1. Функция проверки валидности телефона
-- Отсеивает Telegram User ID (длинные числа >10 цифр, не начинающиеся с 7/8/9)
CREATE OR REPLACE FUNCTION public.is_valid_phone_number(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_digits TEXT;
  v_len INT;
BEGIN
  -- NULL или пустая строка - не валидный телефон
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RETURN FALSE;
  END IF;
  
  -- Извлекаем только цифры
  v_digits := regexp_replace(p_phone, '\D', '', 'g');
  v_len := length(v_digits);
  
  -- Телефон должен быть 10-15 цифр
  IF v_len < 10 OR v_len > 15 THEN
    RETURN FALSE;
  END IF;
  
  -- Telegram User ID обычно:
  -- - Больше 10 цифр
  -- - НЕ начинается с 7, 8, 9 (российские/международные номера)
  -- Если число >10 цифр и не начинается с типичных телефонных префиксов - это скорее всего Telegram ID
  IF v_len > 10 THEN
    -- Разрешаем только если начинается с типичных международных кодов
    IF NOT (
      v_digits LIKE '7%' OR    -- Россия (+7)
      v_digits LIKE '8%' OR    -- Россия (8)
      v_digits LIKE '380%' OR  -- Украина
      v_digits LIKE '375%' OR  -- Беларусь
      v_digits LIKE '998%' OR  -- Узбекистан
      v_digits LIKE '996%' OR  -- Кыргызстан
      v_digits LIKE '992%' OR  -- Таджикистан
      v_digits LIKE '993%' OR  -- Туркменистан
      v_digits LIKE '994%' OR  -- Азербайджан
      v_digits LIKE '995%' OR  -- Грузия
      v_digits LIKE '374%' OR  -- Армения
      v_digits LIKE '373%' OR  -- Молдова
      v_digits LIKE '370%' OR  -- Литва
      v_digits LIKE '371%' OR  -- Латвия
      v_digits LIKE '372%' OR  -- Эстония
      v_digits LIKE '1%' OR    -- США/Канада
      v_digits LIKE '44%' OR   -- UK
      v_digits LIKE '49%' OR   -- Германия
      v_digits LIKE '33%' OR   -- Франция
      v_digits LIKE '39%' OR   -- Италия
      v_digits LIKE '34%' OR   -- Испания
      v_digits LIKE '90%' OR   -- Турция
      v_digits LIKE '86%' OR   -- Китай
      v_digits LIKE '91%'      -- Индия
    ) THEN
      -- Число >10 цифр без известного кода страны - скорее всего Telegram ID
      RETURN FALSE;
    END IF;
  END IF;
  
  -- 10 цифр - российский номер без кода (9xxxxxxxxx)
  IF v_len = 10 THEN
    -- Должен начинаться с 9 (мобильный) или 4,8 (городской)
    IF NOT (v_digits LIKE '9%' OR v_digits LIKE '4%' OR v_digits LIKE '8%') THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- 11 цифр - российский с кодом 7/8
  IF v_len = 11 THEN
    IF NOT (v_digits LIKE '7%' OR v_digits LIKE '8%') THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- 2. Обновляем функцию создания/поиска клиента из Telegram
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
  v_normalized_phone TEXT;
  v_valid_phone TEXT;
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
  
  -- 1. Ищем по telegram_user_id
  SELECT id INTO v_client_id
  FROM clients
  WHERE telegram_user_id = p_telegram_user_id
    AND organization_id = p_organization_id
  LIMIT 1;
  
  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;
  
  -- 2. Ищем по нормализованному телефону (если валидный)
  IF v_normalized_phone IS NOT NULL AND length(v_normalized_phone) = 10 AND v_valid_phone IS NOT NULL THEN
    SELECT id INTO v_client_id
    FROM clients
    WHERE organization_id = p_organization_id
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
  
  -- 3. Создаём нового клиента
  INSERT INTO clients (
    organization_id,
    telegram_user_id,
    phone,
    name,
    source
  ) VALUES (
    p_organization_id,
    p_telegram_user_id,
    v_valid_phone,  -- NULL если это был Telegram ID
    COALESCE(NULLIF(trim(p_name), ''), 'Telegram ' || left(p_telegram_user_id, 8)),
    'telegram'
  )
  RETURNING id INTO v_client_id;
  
  RETURN v_client_id;
END;
$$;

-- 3. Обновляем функцию обогащения клиента из Telegram
CREATE OR REPLACE FUNCTION public.enrich_client_from_telegram(
  p_client_id UUID,
  p_phone TEXT DEFAULT NULL,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_first_name TEXT;
  v_current_last_name TEXT;
  v_valid_phone TEXT;
BEGIN
  -- Получаем текущие значения имени
  SELECT first_name, last_name
  INTO v_current_first_name, v_current_last_name
  FROM clients
  WHERE id = p_client_id;
  
  -- Валидируем телефон - не сохраняем Telegram ID как телефон
  IF p_phone IS NOT NULL AND p_phone != '' THEN
    IF is_valid_phone_number(p_phone) THEN
      v_valid_phone := p_phone;
    ELSE
      v_valid_phone := NULL;
      RAISE NOTICE 'enrich_client: Phone % rejected as invalid (likely Telegram ID)', p_phone;
    END IF;
  END IF;
  
  -- Обновляем только пустые поля (не перезаписываем существующие имена)
  UPDATE clients
  SET
    -- Телефон обновляем только если валидный и текущий пустой
    phone = CASE
      WHEN phone IS NULL OR phone = '' THEN v_valid_phone
      ELSE phone
    END,
    -- Имя НЕ перезаписываем если уже есть
    first_name = CASE
      WHEN v_current_first_name IS NULL OR v_current_first_name = '' 
      THEN COALESCE(NULLIF(trim(p_first_name), ''), first_name)
      ELSE v_current_first_name
    END,
    last_name = CASE
      WHEN v_current_last_name IS NULL OR v_current_last_name = ''
      THEN COALESCE(NULLIF(trim(p_last_name), ''), last_name)
      ELSE v_current_last_name
    END,
    updated_at = now()
  WHERE id = p_client_id;
END;
$$;

-- ============================================
-- Проверка работы
-- ============================================

-- Тест функции валидации:
-- SELECT is_valid_phone_number('79161234567');  -- TRUE (российский мобильный)
-- SELECT is_valid_phone_number('89161234567');  -- TRUE (российский мобильный)
-- SELECT is_valid_phone_number('9161234567');   -- TRUE (10 цифр, начинается с 9)
-- SELECT is_valid_phone_number('1234567890123'); -- FALSE (Telegram ID - 13 цифр, не начинается с известного кода)
-- SELECT is_valid_phone_number('5521234567890'); -- FALSE (не известный код страны)
