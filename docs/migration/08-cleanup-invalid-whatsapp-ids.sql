-- ============================================
-- Очистка невалидных whatsapp_id в clients и client_phone_numbers
-- Для self-hosted Supabase (api.academyos.ru)
-- ============================================
-- 
-- Проблема: в поле whatsapp_chat_id хранятся Telegram User ID
-- вместо реальных WhatsApp номеров. Telegram ID - это числа >10 цифр,
-- не начинающиеся с типичных телефонных кодов (7, 8, 1, 44 и т.д.)
--
-- Правильный WhatsApp ID: "79161234567@c.us" или "79161234567"
-- Неправильный (Telegram ID): "75000001223" (13+ цифр, не телефонный формат)
-- ============================================

-- 0. ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦ
-- Сначала проверьте какие колонки есть:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'clients' AND table_schema = 'public';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'client_phone_numbers' AND table_schema = 'public';

-- 1. ФУНКЦИЯ ВАЛИДАЦИИ WhatsApp ID
-- Проверяет что это реальный телефонный номер, а не Telegram ID
CREATE OR REPLACE FUNCTION public.is_valid_whatsapp_id(p_whatsapp_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_digits TEXT;
  v_len INT;
BEGIN
  -- NULL или пустая строка - не валидный
  IF p_whatsapp_id IS NULL OR trim(p_whatsapp_id) = '' THEN
    RETURN FALSE;
  END IF;
  
  -- Убираем @c.us суффикс если есть
  v_digits := regexp_replace(p_whatsapp_id, '@c\.us$', '', 'i');
  
  -- Извлекаем только цифры
  v_digits := regexp_replace(v_digits, '\D', '', 'g');
  v_len := length(v_digits);
  
  -- WhatsApp номер должен быть 10-15 цифр
  IF v_len < 10 OR v_len > 15 THEN
    RETURN FALSE;
  END IF;
  
  -- Если >11 цифр, проверяем что начинается с известного кода страны
  -- Telegram ID обычно 12+ цифр и НЕ начинаются с типичных кодов
  IF v_len > 11 THEN
    -- Проверяем известные коды стран
    IF NOT (
      v_digits LIKE '7%' OR    -- Россия (+7)
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
      -- Число >11 цифр без известного кода страны - скорее всего Telegram ID
      RETURN FALSE;
    END IF;
  END IF;
  
  -- 10-11 цифр - проверяем российские номера
  IF v_len = 10 THEN
    -- Должен начинаться с 9 (мобильный) или 4,8 (городской)
    IF NOT (v_digits LIKE '9%' OR v_digits LIKE '4%' OR v_digits LIKE '8%') THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  IF v_len = 11 THEN
    IF NOT (v_digits LIKE '7%' OR v_digits LIKE '8%' OR v_digits LIKE '1%') THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- ============================================
-- 2. ДИАГНОСТИКА - Посмотрим что будет очищено
-- ============================================

-- 2.1 Невалидные whatsapp_chat_id в client_phone_numbers
SELECT 
  cpn.id,
  cpn.client_id,
  c.name as client_name,
  cpn.phone,
  cpn.whatsapp_chat_id,
  length(regexp_replace(cpn.whatsapp_chat_id, '\D', '', 'g')) as digits_count,
  CASE 
    WHEN length(regexp_replace(cpn.whatsapp_chat_id, '\D', '', 'g')) > 11 
    THEN 'Слишком длинный (скорее всего Telegram ID)'
    ELSE 'Невалидный формат'
  END as reason
FROM client_phone_numbers cpn
JOIN clients c ON c.id = cpn.client_id
WHERE cpn.whatsapp_chat_id IS NOT NULL 
  AND cpn.whatsapp_chat_id != ''
  AND NOT is_valid_whatsapp_id(cpn.whatsapp_chat_id)
ORDER BY c.created_at DESC
LIMIT 50;

-- 2.2 Подсчёт затронутых записей
SELECT 
  'client_phone_numbers.whatsapp_chat_id' as table_field,
  COUNT(*) as invalid_count
FROM client_phone_numbers
WHERE whatsapp_chat_id IS NOT NULL 
  AND whatsapp_chat_id != ''
  AND NOT is_valid_whatsapp_id(whatsapp_chat_id);

-- ============================================
-- 3. ОЧИСТКА (раскомментируй когда готов)
-- ============================================

/*
-- 3.1 Создаём бэкап перед очисткой
CREATE TABLE IF NOT EXISTS client_phone_numbers_whatsapp_backup AS
SELECT id, client_id, phone, whatsapp_chat_id, updated_at
FROM client_phone_numbers
WHERE whatsapp_chat_id IS NOT NULL 
  AND whatsapp_chat_id != ''
  AND NOT is_valid_whatsapp_id(whatsapp_chat_id);

-- 3.2 Очищаем client_phone_numbers.whatsapp_chat_id
UPDATE client_phone_numbers
SET 
  whatsapp_chat_id = NULL,
  updated_at = now()
WHERE whatsapp_chat_id IS NOT NULL 
  AND whatsapp_chat_id != ''
  AND NOT is_valid_whatsapp_id(whatsapp_chat_id);

-- 3.3 Проверяем результат
SELECT 'Очищено phone_numbers: ' || COUNT(*) as result FROM client_phone_numbers_whatsapp_backup;
*/

-- ============================================
-- 4. ОДНОЙ КОМАНДОЙ (альтернатива без бэкапа)
-- ============================================

/*
-- Очистка client_phone_numbers
WITH cleaned_phones AS (
  UPDATE client_phone_numbers
  SET 
    whatsapp_chat_id = NULL,
    updated_at = now()
  WHERE whatsapp_chat_id IS NOT NULL 
    AND whatsapp_chat_id != ''
    AND NOT is_valid_whatsapp_id(whatsapp_chat_id)
  RETURNING id
)
SELECT 'Очищено client_phone_numbers.whatsapp_chat_id: ' || COUNT(*) FROM cleaned_phones;
*/

-- ============================================
-- 5. ПРОВЕРКА ПОСЛЕ ОЧИСТКИ
-- ============================================

-- Убедиться что невалидных не осталось:
-- SELECT COUNT(*) FROM client_phone_numbers WHERE whatsapp_chat_id IS NOT NULL AND NOT is_valid_whatsapp_id(whatsapp_chat_id);
