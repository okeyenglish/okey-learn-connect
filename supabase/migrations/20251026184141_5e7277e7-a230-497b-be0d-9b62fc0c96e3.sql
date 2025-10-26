-- Add new fields to kw_norm table for better Wordstat data storage
ALTER TABLE kw_norm 
ADD COLUMN IF NOT EXISTS wordstat_competition TEXT,
ADD COLUMN IF NOT EXISTS related_keywords JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_kw_norm_phrase ON kw_norm(phrase);
CREATE INDEX IF NOT EXISTS idx_kw_norm_organization ON kw_norm(organization_id);
CREATE INDEX IF NOT EXISTS idx_kw_norm_last_updated ON kw_norm(last_updated);

-- Update existing records to have source
UPDATE kw_norm SET source = 'wordstat_auto' WHERE source IS NULL;