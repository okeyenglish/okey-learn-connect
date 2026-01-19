-- Create online_test_results table for Step 17
CREATE TABLE online_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_date DATE,
  score NUMERIC,
  max_score NUMERIC,
  percentage NUMERIC,
  passed BOOLEAN DEFAULT false,
  time_spent_minutes INTEGER,
  comments TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_id TEXT,
  holihope_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_online_test_results_student ON online_test_results(student_id);
CREATE INDEX idx_online_test_results_org ON online_test_results(organization_id);
CREATE UNIQUE INDEX idx_online_test_results_external ON online_test_results(external_id, organization_id);

-- Enable RLS
ALTER TABLE online_test_results ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view online test results in their organization"
  ON online_test_results FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert online test results in their organization"
  ON online_test_results FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update online test results in their organization"
  ON online_test_results FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Service role policy for Edge Functions
CREATE POLICY "Service role full access to online_test_results"
  ON online_test_results FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add progress tracking columns
ALTER TABLE holihope_import_progress
  ADD COLUMN IF NOT EXISTS online_tests_skip INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS online_tests_total_imported INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS online_tests_is_running BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS online_tests_last_updated_at TIMESTAMPTZ;