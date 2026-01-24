-- =====================================================
-- МИГРАЦИЯ 23-FIXED: Unified CRM Search (без FTS-векторов)
-- Работает через ILIKE + pg_trgm для поиска по имени
-- =====================================================

-- Индекс для быстрого поиска по телефону (если ещё нет)
CREATE INDEX IF NOT EXISTS idx_client_phone_numbers_phone_trgm 
ON client_phone_numbers USING GIN (phone gin_trgm_ops);

-- Индекс для поиска по имени через триграммы
CREATE INDEX IF NOT EXISTS idx_clients_name_trgm
ON clients USING GIN (name gin_trgm_ops);

-- Составной индекс для first_name + last_name
CREATE INDEX IF NOT EXISTS idx_clients_first_name_trgm
ON clients USING GIN (first_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_last_name_trgm
ON clients USING GIN (last_name gin_trgm_ops);

-- =====================================================
-- RPC: unified_crm_search - через ILIKE (без FTS)
-- =====================================================
CREATE OR REPLACE FUNCTION unified_crm_search(
  p_org_id uuid,
  p_query text,
  p_limit int DEFAULT 50
)
RETURNS TABLE(
  client_id uuid,
  match_type text,
  messenger_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query text;
  v_phone_query text;
  v_is_phone boolean;
BEGIN
  -- Нормализуем запрос
  v_query := trim(p_query);
  
  IF length(v_query) < 2 THEN
    RETURN;
  END IF;
  
  -- Определяем, это телефонный запрос или нет
  v_phone_query := regexp_replace(v_query, '[^0-9+]', '', 'g');
  v_is_phone := length(v_phone_query) >= 4;
  
  RETURN QUERY
  WITH phone_matches AS (
    -- Поиск по телефону
    SELECT DISTINCT
      c.id as client_id,
      'phone'::text as match_type,
      NULL::text as messenger_type
    FROM client_phone_numbers cpn
    JOIN clients c ON c.id = cpn.client_id
    WHERE 
      v_is_phone
      AND c.organization_id = p_org_id
      AND c.is_active = true
      AND cpn.phone ILIKE '%' || v_phone_query || '%'
    LIMIT p_limit
  ),
  name_matches AS (
    -- Поиск по имени через ILIKE
    SELECT DISTINCT
      c.id as client_id,
      'name'::text as match_type,
      NULL::text as messenger_type
    FROM clients c
    WHERE 
      c.organization_id = p_org_id
      AND c.is_active = true
      AND (
        c.name ILIKE '%' || v_query || '%'
        OR c.first_name ILIKE '%' || v_query || '%'
        OR c.last_name ILIKE '%' || v_query || '%'
        OR (c.first_name || ' ' || c.last_name) ILIKE '%' || v_query || '%'
        OR (c.last_name || ' ' || c.first_name) ILIKE '%' || v_query || '%'
      )
    LIMIT p_limit
  ),
  message_matches AS (
    -- Поиск по сообщениям через ILIKE
    SELECT DISTINCT
      cm.client_id,
      'message'::text as match_type,
      cm.messenger_type::text
    FROM chat_messages cm
    JOIN clients c ON c.id = cm.client_id
    WHERE 
      c.organization_id = p_org_id
      AND c.is_active = true
      AND cm.message_text ILIKE '%' || v_query || '%'
    LIMIT p_limit
  ),
  all_results AS (
    SELECT * FROM phone_matches
    UNION ALL
    SELECT * FROM name_matches
    UNION ALL
    SELECT * FROM message_matches
  )
  SELECT DISTINCT ON (ar.client_id)
    ar.client_id,
    ar.match_type,
    ar.messenger_type
  FROM all_results ar
  LIMIT p_limit;
END;
$$;

-- Права доступа
GRANT EXECUTE ON FUNCTION unified_crm_search(uuid, text, int) TO authenticated;

-- Комментарий
COMMENT ON FUNCTION unified_crm_search IS 
'Unified CRM search: ищет клиентов по телефону, имени и содержимому сообщений.
Использует ILIKE + pg_trgm индексы (без FTS-векторов).
Возвращает: client_id, match_type (phone/name/message), messenger_type';
