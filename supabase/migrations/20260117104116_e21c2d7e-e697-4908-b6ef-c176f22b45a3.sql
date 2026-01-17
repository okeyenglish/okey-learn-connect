-- Функция для получения клиентов без импортированных сообщений
CREATE OR REPLACE FUNCTION get_clients_without_imported_messages(
  p_org_id UUID,
  p_offset INT DEFAULT 0,
  p_limit INT DEFAULT 20
)
RETURNS TABLE(
  id UUID, 
  name TEXT, 
  salebot_client_id BIGINT
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.salebot_client_id
  FROM clients c
  WHERE c.organization_id = p_org_id
    AND c.salebot_client_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM chat_messages m 
      WHERE m.client_id = c.id 
        AND m.salebot_message_id IS NOT NULL
    )
  ORDER BY c.created_at
  OFFSET p_offset
  LIMIT p_limit;
$$;

-- Функция для подсчёта таких клиентов
CREATE OR REPLACE FUNCTION count_clients_without_imported_messages(p_org_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM clients c
  WHERE c.organization_id = p_org_id
    AND c.salebot_client_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM chat_messages m 
      WHERE m.client_id = c.id 
        AND m.salebot_message_id IS NOT NULL
    );
$$;