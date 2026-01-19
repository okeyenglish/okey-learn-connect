-- Create group_tests table for storing group test results from Holihope
-- ed_unit_id stored as text (external reference) since educational_units table doesn't exist
CREATE TABLE IF NOT EXISTS public.group_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ed_unit_id text,
  learning_group_id uuid REFERENCES public.learning_groups(id) ON DELETE SET NULL,
  test_name text NOT NULL DEFAULT 'Без названия',
  test_date date,
  subject text,
  level text,
  max_score numeric,
  average_score numeric,
  comments text,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  external_id text,
  holihope_metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(external_id, organization_id)
);

-- Enable RLS
ALTER TABLE public.group_tests ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view group_tests in their organization"
  ON public.group_tests FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert group_tests in their organization"
  ON public.group_tests FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update group_tests in their organization"
  ON public.group_tests FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete group_tests in their organization"
  ON public.group_tests FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Indexes for faster lookups
CREATE INDEX idx_group_tests_ed_unit_id ON public.group_tests(ed_unit_id);
CREATE INDEX idx_group_tests_learning_group_id ON public.group_tests(learning_group_id);
CREATE INDEX idx_group_tests_organization_id ON public.group_tests(organization_id);
CREATE INDEX idx_group_tests_external_id ON public.group_tests(external_id);
CREATE INDEX idx_group_tests_test_date ON public.group_tests(test_date);