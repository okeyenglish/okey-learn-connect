
-- Transfer phone number from deactivated client to active merged client
UPDATE client_phone_numbers
SET client_id = 'a3026be1-68a7-41de-bd46-212ef4599b86'
WHERE client_id = 'cc513cc4-9cdb-463a-98b1-9ba16fb564db';

-- Also update the phone field on the client
UPDATE clients
SET phone = '79366210015'
WHERE id = 'a3026be1-68a7-41de-bd46-212ef4599b86';

-- Fix duplicate messages: delete whatsapp duplicates that have telegram equivalents
-- (messages imported from salebot incorrectly marked as whatsapp when they are telegram)
-- Keep telegram messages, delete whatsapp duplicates with salebot_message_id
DELETE FROM chat_messages
WHERE client_id = 'a3026be1-68a7-41de-bd46-212ef4599b86'
  AND messenger_type = 'whatsapp'
  AND salebot_message_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM chat_messages t
    WHERE t.client_id = 'a3026be1-68a7-41de-bd46-212ef4599b86'
      AND t.messenger_type = 'telegram'
      AND t.message_text = chat_messages.message_text
      AND ABS(EXTRACT(EPOCH FROM (t.created_at - chat_messages.created_at))) < 10
  );
