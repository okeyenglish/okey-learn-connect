-- Add submitted_at column to publication_queue table
ALTER TABLE publication_queue 
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;