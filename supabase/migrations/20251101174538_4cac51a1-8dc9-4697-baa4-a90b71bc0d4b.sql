-- Add published_at column to apps table
ALTER TABLE apps ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;

-- Update existing published apps to set published_at to their updated_at
UPDATE apps SET published_at = updated_at WHERE status = 'published' AND published_at IS NULL;