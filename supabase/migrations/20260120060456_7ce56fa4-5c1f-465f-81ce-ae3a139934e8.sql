-- GIN индекс для полнотекстового поиска по сообщениям
CREATE INDEX IF NOT EXISTS idx_chat_messages_text_search 
ON chat_messages 
USING GIN (to_tsvector('russian', coalesce(message_text, '')));

-- GIN индекс для поиска по имени клиентов
CREATE INDEX IF NOT EXISTS idx_clients_name_gin 
ON clients 
USING GIN (to_tsvector('russian', coalesce(name, '') || ' ' || coalesce(first_name, '') || ' ' || coalesce(last_name, '')));

-- RPC функция для быстрого поиска по сообщениям
CREATE OR REPLACE FUNCTION search_messages_by_text(
  p_org_id uuid,
  p_search_text text,
  p_limit int DEFAULT 100
)
RETURNS TABLE(client_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT cm.client_id
  FROM chat_messages cm
  WHERE cm.organization_id = p_org_id
    AND to_tsvector('russian', coalesce(cm.message_text, '')) 
        @@ plainto_tsquery('russian', p_search_text)
  ORDER BY cm.client_id
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- RPC функция для быстрого поиска клиентов по имени
CREATE OR REPLACE FUNCTION search_clients_by_name(
  p_org_id uuid,
  p_search_text text,
  p_limit int DEFAULT 100
)
RETURNS TABLE(id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id
  FROM clients c
  WHERE c.organization_id = p_org_id
    AND c.is_active = true
    AND to_tsvector('russian', coalesce(c.name, '') || ' ' || coalesce(c.first_name, '') || ' ' || coalesce(c.last_name, ''))
        @@ plainto_tsquery('russian', p_search_text)
  ORDER BY c.id
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;