-- Allow leads to have null phone numbers
ALTER TABLE leads ALTER COLUMN phone DROP NOT NULL;