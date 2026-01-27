-- ============================================
-- Очистка невалидных телефонов в clients
-- Выполнить на self-hosted Supabase (api.academyos.ru)
-- ============================================

-- 1. Сначала посмотрим что будет очищено (DRY RUN)
SELECT 
  c.id,
  c.name,
  c.phone,
  c.telegram_user_id,
  o.name as organization_name,
  CASE 
    WHEN c.phone ~ '^\d{10,}$' AND length(regexp_replace(c.phone, '\D', '', 'g')) > 11 
    THEN 'Похоже на Telegram ID'
    ELSE 'Невалидный формат'
  END as reason
FROM clients c
LEFT JOIN organizations o ON o.id = c.organization_id
WHERE c.phone IS NOT NULL 
  AND c.phone != ''
  AND NOT is_valid_phone_number(c.phone)
ORDER BY o.name, c.created_at DESC;

-- 2. Посчитаем сколько записей будет затронуто
SELECT 
  o.name as organization_name,
  COUNT(*) as invalid_phones_count
FROM clients c
LEFT JOIN organizations o ON o.id = c.organization_id
WHERE c.phone IS NOT NULL 
  AND c.phone != ''
  AND NOT is_valid_phone_number(c.phone)
GROUP BY o.name
ORDER BY invalid_phones_count DESC;

-- ============================================
-- 3. ОЧИСТКА (раскомментируй когда готов)
-- ============================================

/*
-- Создаём бэкап перед очисткой
CREATE TABLE IF NOT EXISTS clients_phone_backup AS
SELECT id, phone, telegram_user_id, updated_at
FROM clients
WHERE phone IS NOT NULL 
  AND phone != ''
  AND NOT is_valid_phone_number(phone);

-- Выполняем очистку
UPDATE clients
SET 
  phone = NULL,
  updated_at = now()
WHERE phone IS NOT NULL 
  AND phone != ''
  AND NOT is_valid_phone_number(phone);

-- Проверяем результат
SELECT 
  'Очищено записей: ' || COUNT(*) as result
FROM clients_phone_backup;
*/

-- ============================================
-- Альтернатива: одной командой без бэкапа
-- ============================================

-- Раскомментируй и выполни:
/*
WITH cleaned AS (
  UPDATE clients
  SET 
    phone = NULL,
    updated_at = now()
  WHERE phone IS NOT NULL 
    AND phone != ''
    AND NOT is_valid_phone_number(phone)
  RETURNING id, phone
)
SELECT COUNT(*) as cleaned_count FROM cleaned;
*/

-- ============================================
-- Проверка после очистки
-- ============================================

-- Убедиться что невалидных телефонов не осталось:
-- SELECT COUNT(*) FROM clients WHERE phone IS NOT NULL AND NOT is_valid_phone_number(phone);
