-- Update existing test client phone to match OnlinePBX format for testing
UPDATE clients 
SET phone = '+7 (900) 123-45-67'
WHERE id = '550e8400-e29b-41d4-a716-446655440099';