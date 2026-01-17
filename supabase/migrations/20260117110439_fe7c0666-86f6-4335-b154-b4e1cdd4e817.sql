
-- Fix recent duplicates for this client: delete telegram messages without salebot_message_id
-- that have a matching salebot message within 10 seconds
DELETE FROM chat_messages
WHERE client_id = 'a3026be1-68a7-41de-bd46-212ef4599b86'
  AND messenger_type = 'telegram'
  AND salebot_message_id IS NULL
  AND created_at > '2026-01-17 10:50:00'
  AND EXISTS (
    SELECT 1 FROM chat_messages s
    WHERE s.client_id = 'a3026be1-68a7-41de-bd46-212ef4599b86'
      AND s.salebot_message_id IS NOT NULL
      AND s.message_text = chat_messages.message_text
      AND ABS(EXTRACT(EPOCH FROM (s.created_at - chat_messages.created_at))) < 10
  );

-- Update the remaining salebot messages from whatsapp to telegram (since client_type=21 is telegram)
UPDATE chat_messages
SET messenger_type = 'telegram'
WHERE client_id = 'a3026be1-68a7-41de-bd46-212ef4599b86'
  AND messenger_type = 'whatsapp'
  AND salebot_message_id IS NOT NULL
  AND created_at > '2026-01-17 10:50:00';
