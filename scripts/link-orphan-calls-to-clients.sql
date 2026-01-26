-- =====================================================
-- Массовая привязка звонков без client_id к клиентам
-- Запускать на self-hosted сервере (api.academyos.ru)
-- =====================================================

-- 1. Создаём функцию нормализации телефона (последние 10 цифр)
CREATE OR REPLACE FUNCTION normalize_phone_last10(phone TEXT)
RETURNS TEXT AS $$
BEGIN
  IF phone IS NULL OR phone = '' THEN
    RETURN NULL;
  END IF;
  -- Убираем все нецифровые символы и берём последние 10 цифр
  RETURN RIGHT(regexp_replace(phone, '[^0-9]', '', 'g'), 10);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Предварительный анализ: сколько звонков без client_id
SELECT 
  COUNT(*) as total_orphan_calls,
  COUNT(DISTINCT phone_number) as unique_phones
FROM call_logs 
WHERE client_id IS NULL 
  AND phone_number IS NOT NULL 
  AND phone_number != '';

-- 3. Превью: какие звонки будут привязаны (первые 50)
WITH orphan_calls AS (
  SELECT 
    cl.id as call_id,
    cl.phone_number,
    cl.organization_id,
    normalize_phone_last10(cl.phone_number) as normalized_phone
  FROM call_logs cl
  WHERE cl.client_id IS NULL 
    AND cl.phone_number IS NOT NULL 
    AND cl.phone_number != ''
),
matched_clients AS (
  -- Поиск по основному телефону клиента
  SELECT DISTINCT ON (oc.call_id)
    oc.call_id,
    oc.phone_number as call_phone,
    c.id as client_id,
    c.name as client_name,
    c.phone as client_phone,
    'clients.phone' as match_source
  FROM orphan_calls oc
  JOIN clients c ON c.organization_id = oc.organization_id
    AND normalize_phone_last10(c.phone) = oc.normalized_phone
  WHERE c.phone IS NOT NULL
  
  UNION ALL
  
  -- Поиск по дополнительным телефонам
  SELECT DISTINCT ON (oc.call_id)
    oc.call_id,
    oc.phone_number as call_phone,
    cpn.client_id,
    c.name as client_name,
    cpn.phone as client_phone,
    'client_phone_numbers' as match_source
  FROM orphan_calls oc
  JOIN client_phone_numbers cpn ON normalize_phone_last10(cpn.phone) = oc.normalized_phone
  JOIN clients c ON c.id = cpn.client_id AND c.organization_id = oc.organization_id
  WHERE cpn.phone IS NOT NULL
)
SELECT * FROM matched_clients LIMIT 50;

-- 4. Подсчёт: сколько звонков будет привязано
WITH orphan_calls AS (
  SELECT 
    cl.id as call_id,
    cl.organization_id,
    normalize_phone_last10(cl.phone_number) as normalized_phone
  FROM call_logs cl
  WHERE cl.client_id IS NULL 
    AND cl.phone_number IS NOT NULL 
    AND cl.phone_number != ''
),
matched AS (
  SELECT oc.call_id
  FROM orphan_calls oc
  WHERE EXISTS (
    SELECT 1 FROM clients c 
    WHERE c.organization_id = oc.organization_id
      AND normalize_phone_last10(c.phone) = oc.normalized_phone
  )
  OR EXISTS (
    SELECT 1 FROM client_phone_numbers cpn
    JOIN clients c ON c.id = cpn.client_id AND c.organization_id = oc.organization_id
    WHERE normalize_phone_last10(cpn.phone) = oc.normalized_phone
  )
)
SELECT COUNT(*) as calls_to_be_linked FROM matched;

-- =====================================================
-- 5. ВЫПОЛНЕНИЕ ПРИВЯЗКИ (раскомментируйте для запуска)
-- =====================================================

/*
-- Привязка по основному телефону клиента
UPDATE call_logs cl
SET client_id = matched.client_id,
    updated_at = NOW()
FROM (
  SELECT DISTINCT ON (cl2.id)
    cl2.id as call_log_id,
    c.id as client_id
  FROM call_logs cl2
  JOIN clients c ON c.organization_id = cl2.organization_id
    AND normalize_phone_last10(c.phone) = normalize_phone_last10(cl2.phone_number)
  WHERE cl2.client_id IS NULL 
    AND cl2.phone_number IS NOT NULL 
    AND cl2.phone_number != ''
    AND c.phone IS NOT NULL
) matched
WHERE cl.id = matched.call_log_id;

-- Вывод результата первого UPDATE
SELECT 'Linked via clients.phone:' as step, COUNT(*) as count 
FROM call_logs WHERE client_id IS NOT NULL AND updated_at > NOW() - INTERVAL '1 minute';

-- Привязка по дополнительным телефонам (для оставшихся)
UPDATE call_logs cl
SET client_id = matched.client_id,
    updated_at = NOW()
FROM (
  SELECT DISTINCT ON (cl2.id)
    cl2.id as call_log_id,
    cpn.client_id as client_id
  FROM call_logs cl2
  JOIN client_phone_numbers cpn ON normalize_phone_last10(cpn.phone) = normalize_phone_last10(cl2.phone_number)
  JOIN clients c ON c.id = cpn.client_id AND c.organization_id = cl2.organization_id
  WHERE cl2.client_id IS NULL 
    AND cl2.phone_number IS NOT NULL 
    AND cl2.phone_number != ''
    AND cpn.phone IS NOT NULL
) matched
WHERE cl.id = matched.call_log_id;

-- Итоговая статистика
SELECT 
  'Total orphan calls remaining:' as metric,
  COUNT(*) as count
FROM call_logs 
WHERE client_id IS NULL 
  AND phone_number IS NOT NULL 
  AND phone_number != '';
*/

-- =====================================================
-- 6. Полезные запросы для анализа
-- =====================================================

-- Телефоны звонков, которые НЕ удалось привязать
/*
SELECT DISTINCT 
  cl.phone_number,
  normalize_phone_last10(cl.phone_number) as normalized,
  COUNT(*) as call_count
FROM call_logs cl
WHERE cl.client_id IS NULL 
  AND cl.phone_number IS NOT NULL 
  AND cl.phone_number != ''
  AND NOT EXISTS (
    SELECT 1 FROM clients c 
    WHERE c.organization_id = cl.organization_id
      AND normalize_phone_last10(c.phone) = normalize_phone_last10(cl.phone_number)
  )
  AND NOT EXISTS (
    SELECT 1 FROM client_phone_numbers cpn
    JOIN clients c ON c.id = cpn.client_id AND c.organization_id = cl.organization_id
    WHERE normalize_phone_last10(cpn.phone) = normalize_phone_last10(cl.phone_number)
  )
GROUP BY cl.phone_number, normalize_phone_last10(cl.phone_number)
ORDER BY call_count DESC
LIMIT 50;
*/
