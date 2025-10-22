-- Обновляем last_message_at для всех клиентов на основе реального времени последнего сообщения
UPDATE clients c
SET last_message_at = (
  SELECT MAX(cm.created_at)
  FROM chat_messages cm
  WHERE cm.client_id = c.id
)
WHERE EXISTS (
  SELECT 1 FROM chat_messages cm2 
  WHERE cm2.client_id = c.id
);

-- Создаем функцию для автоматического обновления last_message_at при добавлении/изменении сообщений
CREATE OR REPLACE FUNCTION update_client_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE clients
  SET last_message_at = NEW.created_at
  WHERE id = NEW.client_id
    AND (last_message_at IS NULL OR last_message_at < NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Создаем триггер для автоматического обновления last_message_at
DROP TRIGGER IF EXISTS trigger_update_client_last_message_at ON chat_messages;
CREATE TRIGGER trigger_update_client_last_message_at
  AFTER INSERT OR UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_client_last_message_at();