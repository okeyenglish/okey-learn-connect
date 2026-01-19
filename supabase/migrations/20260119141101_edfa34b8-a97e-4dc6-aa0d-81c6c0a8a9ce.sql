-- Add organization_id column to holihope_import_progress
ALTER TABLE holihope_import_progress 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_holihope_import_progress_org_id 
ON holihope_import_progress(organization_id);

-- Update existing record with organization_id from profiles (first org found)
UPDATE holihope_import_progress p
SET organization_id = (
  SELECT DISTINCT organization_id 
  FROM profiles 
  WHERE organization_id IS NOT NULL 
  LIMIT 1
)
WHERE organization_id IS NULL;