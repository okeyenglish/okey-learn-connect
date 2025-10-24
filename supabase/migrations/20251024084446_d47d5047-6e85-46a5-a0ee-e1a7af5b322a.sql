-- Функция для нормализации телефонов: приводит к формату 79161234567
CREATE OR REPLACE FUNCTION normalize_phone(phone_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
BEGIN
  -- Если NULL или пустая строка, возвращаем как есть
  IF phone_input IS NULL OR phone_input = '' THEN
    RETURN phone_input;
  END IF;
  
  -- Убираем все символы кроме цифр
  cleaned := regexp_replace(phone_input, '[^\d]', '', 'g');
  
  -- Если номер начинается с 8 (российский формат), заменяем на 7
  IF cleaned ~ '^8\d{10}$' THEN
    cleaned := '7' || substring(cleaned from 2);
  END IF;
  
  -- Если номер 10 цифр (без кода страны), добавляем 7
  IF length(cleaned) = 10 THEN
    cleaned := '7' || cleaned;
  END IF;
  
  -- Если номер начинается с 7 и длина 11 цифр, это корректный формат
  IF cleaned ~ '^7\d{10}$' THEN
    RETURN cleaned;
  END IF;
  
  -- Иначе возвращаем только цифры (для международных номеров)
  RETURN cleaned;
END;
$$;

-- Триггер функция для автоматической нормализации телефонов в clients
CREATE OR REPLACE FUNCTION trigger_normalize_client_phone()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Нормализуем поле phone
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    NEW.phone := normalize_phone(NEW.phone);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Триггер функция для автоматической нормализации телефонов в client_phone_numbers
CREATE OR REPLACE FUNCTION trigger_normalize_client_phone_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Нормализуем поле phone
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    NEW.phone := normalize_phone(NEW.phone);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Триггер функция для автоматической нормализации телефонов в call_logs
CREATE OR REPLACE FUNCTION trigger_normalize_call_log_phone()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Нормализуем поле phone_number
  IF NEW.phone_number IS NOT NULL AND NEW.phone_number != '' THEN
    NEW.phone_number := normalize_phone(NEW.phone_number);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Создаем триггеры для автоматической нормализации
DROP TRIGGER IF EXISTS normalize_client_phone_trigger ON clients;
CREATE TRIGGER normalize_client_phone_trigger
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION trigger_normalize_client_phone();

DROP TRIGGER IF EXISTS normalize_client_phone_number_trigger ON client_phone_numbers;
CREATE TRIGGER normalize_client_phone_number_trigger
  BEFORE INSERT OR UPDATE ON client_phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_normalize_client_phone_number();

DROP TRIGGER IF EXISTS normalize_call_log_phone_trigger ON call_logs;
CREATE TRIGGER normalize_call_log_phone_trigger
  BEFORE INSERT OR UPDATE ON call_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_normalize_call_log_phone();

-- Нормализуем существующие телефоны в clients
UPDATE clients
SET phone = normalize_phone(phone)
WHERE phone IS NOT NULL AND phone != '';

-- Нормализуем существующие телефоны в client_phone_numbers
UPDATE client_phone_numbers
SET phone = normalize_phone(phone)
WHERE phone IS NOT NULL AND phone != '';

-- Нормализуем существующие телефоны в call_logs
UPDATE call_logs
SET phone_number = normalize_phone(phone_number)
WHERE phone_number IS NOT NULL AND phone_number != '';

-- Комментарии для документации
COMMENT ON FUNCTION normalize_phone(text) IS 'Нормализует телефонные номера к единому формату 79161234567';
COMMENT ON FUNCTION trigger_normalize_client_phone() IS 'Триггер для автоматической нормализации телефонов в таблице clients';
COMMENT ON FUNCTION trigger_normalize_client_phone_number() IS 'Триггер для автоматической нормализации телефонов в таблице client_phone_numbers';
COMMENT ON FUNCTION trigger_normalize_call_log_phone() IS 'Триггер для автоматической нормализации телефонов в таблице call_logs';