-- Remove duplicate rows in holihope_import_progress, keep only the most recent per organization_id
DELETE FROM holihope_import_progress 
WHERE id NOT IN (
  SELECT DISTINCT ON (organization_id) id 
  FROM holihope_import_progress 
  ORDER BY organization_id, updated_at DESC
);

-- Add unique constraint on organization_id to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_holihope_import_progress_org_unique 
ON holihope_import_progress(organization_id);