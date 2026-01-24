-- =====================================================
-- Unified CRM Search Optimization
-- Объединяет 3 отдельных поисковых запроса в 1
-- =====================================================

-- 1. Добавляем GIN индекс для поиска по телефону (pg_trgm)
CREATE INDEX IF NOT EXISTS idx_client_phone_numbers_phone_trgm
ON client_phone_numbers
USING GIN (phone gin_trgm_ops);

-- 2. Единая RPC функция для всех типов поиска
CREATE OR REPLACE FUNCTION unified_crm_search(
  p_org_id uuid,
  p_query text,
  p_limit int DEFAULT 50
)
RETURNS TABLE(
  client_id uuid,
  match_type text,  -- 'phone', 'name', 'message'
  messenger_type text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query text;
  v_normalized_phone text;
  v_is_phone_search boolean;
  v_tsquery tsquery;
BEGIN
  -- Нормализуем запрос
  v_query := trim(p_query);
  IF v_query = '' THEN
    RETURN;
  END IF;
  
  -- Определяем тип поиска: телефон или текст
  v_normalized_phone := regexp_replace(v_query, '[^0-9]', '', 'g');
  v_is_phone_search := length(v_normalized_phone) >= 5 AND v_query ~ '^[\d\s\+\-\(\)]+$';
  
  -- Подготавливаем tsquery для FTS
  BEGIN
    v_tsquery := plainto_tsquery('russian', v_query);
  EXCEPTION WHEN OTHERS THEN
    v_tsquery := NULL;
  END;
  
  -- Выполняем все поиски в одном запросе через UNION ALL
  RETURN QUERY
  WITH 
  -- Поиск по телефону
  phone_matches AS (
    SELECT DISTINCT cpn.client_id, 'phone'::text AS match_type, NULL::text AS messenger_type
    FROM client_phone_numbers cpn
    JOIN clients c ON c.id = cpn.client_id
    WHERE v_is_phone_search
      AND c.organization_id = p_org_id
      AND c.is_active = true
      AND cpn.phone ILIKE '%' || v_normalized_phone || '%'
    LIMIT p_limit
  ),
  
  -- Поиск по имени (FTS с fallback на ILIKE)
  name_matches AS (
    SELECT DISTINCT c.id AS client_id, 'name'::text AS match_type, NULL::text AS messenger_type
    FROM clients c
    WHERE NOT v_is_phone_search
      AND c.organization_id = p_org_id
      AND c.is_active = true
      AND length(v_query) >= 2
      AND (
        -- FTS поиск (быстрый)
        (v_tsquery IS NOT NULL AND c.name_search_vector @@ v_tsquery)
        OR
        -- Fallback на ILIKE если FTS не нашёл
        (c.name ILIKE '%' || v_query || '%')
        OR (c.first_name ILIKE '%' || v_query || '%')
        OR (c.last_name ILIKE '%' || v_query || '%')
      )
    LIMIT p_limit
  ),
  
  -- Поиск по содержимому сообщений (progressive: 90 дней -> 180 -> all)
  message_matches AS (
    SELECT DISTINCT ON (cm.client_id) 
      cm.client_id, 
      'message'::text AS match_type,
      cm.messenger_type::text
    FROM chat_messages cm
    JOIN clients c ON c.id = cm.client_id
    WHERE NOT v_is_phone_search
      AND cm.organization_id = p_org_id
      AND c.is_active = true
      AND length(v_query) >= 3
      AND (
        -- FTS поиск по сообщениям
        (v_tsquery IS NOT NULL AND cm.message_search_vector @@ v_tsquery)
        OR
        -- Fallback ILIKE
        (cm.message_text ILIKE '%' || v_query || '%')
      )
    ORDER BY cm.client_id, cm.created_at DESC
    LIMIT p_limit
  )
  
  -- Объединяем все результаты
  SELECT pm.client_id, pm.match_type, pm.messenger_type FROM phone_matches pm
  UNION ALL
  SELECT nm.client_id, nm.match_type, nm.messenger_type FROM name_matches nm
  UNION ALL
  SELECT mm.client_id, mm.match_type, mm.messenger_type FROM message_matches mm;
  
END;
$$;

-- Даём права на выполнение
GRANT EXECUTE ON FUNCTION unified_crm_search(uuid, text, int) TO authenticated;

-- 3. Комментарий для документации
COMMENT ON FUNCTION unified_crm_search IS 
'Единый поиск по CRM: телефон, имя клиента, содержимое сообщений.
Возвращает client_id, тип совпадения и messenger_type (для сообщений).
Оптимизирован для скорости: использует GIN индексы и FTS.';
