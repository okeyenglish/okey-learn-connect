
-- Update existing messages with placeholder text [documentMessage] and similar
UPDATE chat_messages
SET message_text = CASE 
  WHEN message_text = '[documentMessage]' AND file_name IS NOT NULL THEN '📄 ' || file_name
  WHEN message_text = '[documentMessage]' THEN '📄 Документ'
  WHEN message_text = '[imageMessage]' THEN '🖼️ Изображение'
  WHEN message_text = '[videoMessage]' THEN '🎬 Видео'
  WHEN message_text = '[audioMessage]' THEN '🎵 Аудио'
  ELSE message_text
END
WHERE message_text IN ('[documentMessage]', '[imageMessage]', '[videoMessage]', '[audioMessage]')
  AND file_url IS NOT NULL;
