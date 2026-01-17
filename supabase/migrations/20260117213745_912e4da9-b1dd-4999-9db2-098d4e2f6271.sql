
-- First, delete duplicate messages from duplicate clients (messages that exist in both original and duplicate)
-- Since both clients have same salebot_message_id for same messages, we just delete messages from duplicate clients

-- Delete messages from duplicate clients completely (they are already on original clients)
DELETE FROM chat_messages WHERE client_id IN (
  '574697f3-b586-4add-a275-1fcadf2aebcb',
  '3ebfd808-0e5b-4e38-8255-d6f65277bb0b',
  'fc3dd53c-0da5-4d52-a247-8971e37d6a42',
  '9a807c17-a9c2-45dd-a20e-8cfe727d62db',
  '325c6541-2372-4e7a-9dcc-c1147a5dde7e',
  '8e444f01-dd93-4972-9deb-6029762c3250'
);

-- Delete chat_states for duplicate clients
DELETE FROM chat_states WHERE chat_id IN (
  '574697f3-b586-4add-a275-1fcadf2aebcb',
  '3ebfd808-0e5b-4e38-8255-d6f65277bb0b',
  'fc3dd53c-0da5-4d52-a247-8971e37d6a42',
  '9a807c17-a9c2-45dd-a20e-8cfe727d62db',
  '325c6541-2372-4e7a-9dcc-c1147a5dde7e',
  '8e444f01-dd93-4972-9deb-6029762c3250'
);

-- Delete duplicate phone numbers
DELETE FROM client_phone_numbers WHERE client_id IN (
  '574697f3-b586-4add-a275-1fcadf2aebcb',
  '3ebfd808-0e5b-4e38-8255-d6f65277bb0b',
  'fc3dd53c-0da5-4d52-a247-8971e37d6a42',
  '9a807c17-a9c2-45dd-a20e-8cfe727d62db',
  '325c6541-2372-4e7a-9dcc-c1147a5dde7e',
  '8e444f01-dd93-4972-9deb-6029762c3250'
);

-- Delete duplicate family_members
DELETE FROM family_members WHERE client_id IN (
  '574697f3-b586-4add-a275-1fcadf2aebcb',
  '3ebfd808-0e5b-4e38-8255-d6f65277bb0b',
  'fc3dd53c-0da5-4d52-a247-8971e37d6a42',
  '9a807c17-a9c2-45dd-a20e-8cfe727d62db',
  '325c6541-2372-4e7a-9dcc-c1147a5dde7e',
  '8e444f01-dd93-4972-9deb-6029762c3250'
);

-- Delete duplicate client_branches
DELETE FROM client_branches WHERE client_id IN (
  '574697f3-b586-4add-a275-1fcadf2aebcb',
  '3ebfd808-0e5b-4e38-8255-d6f65277bb0b',
  'fc3dd53c-0da5-4d52-a247-8971e37d6a42',
  '9a807c17-a9c2-45dd-a20e-8cfe727d62db',
  '325c6541-2372-4e7a-9dcc-c1147a5dde7e',
  '8e444f01-dd93-4972-9deb-6029762c3250'
);

-- Delete global_chat_read_status for duplicate clients
DELETE FROM global_chat_read_status WHERE chat_id IN (
  '574697f3-b586-4add-a275-1fcadf2aebcb',
  '3ebfd808-0e5b-4e38-8255-d6f65277bb0b',
  'fc3dd53c-0da5-4d52-a247-8971e37d6a42',
  '9a807c17-a9c2-45dd-a20e-8cfe727d62db',
  '325c6541-2372-4e7a-9dcc-c1147a5dde7e',
  '8e444f01-dd93-4972-9deb-6029762c3250'
);

-- Delete duplicate clients
DELETE FROM clients WHERE id IN (
  '574697f3-b586-4add-a275-1fcadf2aebcb',
  '3ebfd808-0e5b-4e38-8255-d6f65277bb0b',
  'fc3dd53c-0da5-4d52-a247-8971e37d6a42',
  '9a807c17-a9c2-45dd-a20e-8cfe727d62db',
  '325c6541-2372-4e7a-9dcc-c1147a5dde7e',
  '8e444f01-dd93-4972-9deb-6029762c3250'
);

-- Create unique index to prevent future duplicates on salebot_client_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_salebot_client_id_unique 
ON clients(salebot_client_id) 
WHERE salebot_client_id IS NOT NULL;
