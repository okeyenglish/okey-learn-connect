-- Make phone column nullable in clients table since many agents don't have phone numbers
ALTER TABLE clients ALTER COLUMN phone DROP NOT NULL;