-- Create client_branches table for multiple branches per client
CREATE TABLE IF NOT EXISTS client_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  branch text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, branch)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_client_branches_client_id ON client_branches(client_id);
CREATE INDEX IF NOT EXISTS idx_client_branches_branch ON client_branches(branch);

-- Create lead_branches table for multiple branches per lead
CREATE TABLE IF NOT EXISTS lead_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  branch text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, branch)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_lead_branches_lead_id ON lead_branches(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_branches_branch ON lead_branches(branch);

-- Enable RLS for client_branches
ALTER TABLE client_branches ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_branches
CREATE POLICY "Users can view client branches in their organization"
  ON client_branches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_branches.client_id
      AND c.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Users can insert client branches in their organization"
  ON client_branches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_branches.client_id
      AND c.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Users can update client branches in their organization"
  ON client_branches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_branches.client_id
      AND c.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Users can delete client branches in their organization"
  ON client_branches FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_branches.client_id
      AND c.organization_id = get_user_organization_id()
    )
  );

-- Enable RLS for lead_branches
ALTER TABLE lead_branches ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_branches (simplified - allow all authenticated users)
CREATE POLICY "Authenticated users can view lead branches"
  ON lead_branches FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage lead branches"
  ON lead_branches FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Migrate existing data from clients.branch to client_branches
INSERT INTO client_branches (client_id, branch)
SELECT id, branch
FROM clients
WHERE branch IS NOT NULL AND branch != ''
ON CONFLICT (client_id, branch) DO NOTHING;

-- Migrate existing data from leads.branch to lead_branches
INSERT INTO lead_branches (lead_id, branch)
SELECT id, branch
FROM leads
WHERE branch IS NOT NULL AND branch != ''
ON CONFLICT (lead_id, branch) DO NOTHING;