-- Create entrance_tests table for storing entrance test results
CREATE TABLE public.entrance_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  lead_id TEXT,
  test_date DATE,
  assigned_level TEXT,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  comments TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  external_id TEXT,
  holihope_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create unique index for external_id within organization
CREATE UNIQUE INDEX entrance_tests_external_id_org_idx 
ON public.entrance_tests(external_id, organization_id) 
WHERE external_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.entrance_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view entrance tests in their organization"
  ON public.entrance_tests FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can insert entrance tests in their organization"
  ON public.entrance_tests FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update entrance tests in their organization"
  ON public.entrance_tests FOR UPDATE
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can delete entrance tests in their organization"
  ON public.entrance_tests FOR DELETE
  USING (organization_id = public.get_user_organization_id());

-- Trigger for updated_at
CREATE TRIGGER update_entrance_tests_updated_at
  BEFORE UPDATE ON public.entrance_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();