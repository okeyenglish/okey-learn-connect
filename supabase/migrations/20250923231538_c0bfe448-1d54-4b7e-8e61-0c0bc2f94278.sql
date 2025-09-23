-- Insert a test client and call log to verify the system works
INSERT INTO clients (id, name, phone, branch) 
VALUES ('550e8400-e29b-41d4-a716-446655440099', 'Тестовый клиент вебхука', '79001234567', 'Окская')
ON CONFLICT (id) DO UPDATE SET 
  phone = EXCLUDED.phone,
  name = EXCLUDED.name;

-- Insert a test call log
INSERT INTO call_logs (
  client_id, 
  phone_number, 
  direction, 
  status, 
  duration_seconds, 
  started_at, 
  external_call_id
) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440099', 
  '79001234567', 
  'incoming', 
  'answered', 
  120, 
  now() - interval '1 hour',
  'test_call_123'
) 
ON CONFLICT DO NOTHING;