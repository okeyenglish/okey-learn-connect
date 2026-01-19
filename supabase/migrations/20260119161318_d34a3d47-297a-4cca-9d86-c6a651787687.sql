-- Drop partial unique indexes (they don't work with upsert ON CONFLICT)
DROP INDEX IF EXISTS entrance_tests_external_id_org_idx;
DROP INDEX IF EXISTS personal_tests_external_id_org_idx;

-- Create regular unique indexes (without WHERE clause)
CREATE UNIQUE INDEX entrance_tests_external_id_org_idx 
  ON entrance_tests (external_id, organization_id);
  
CREATE UNIQUE INDEX personal_tests_external_id_org_idx 
  ON personal_tests (external_id, organization_id);