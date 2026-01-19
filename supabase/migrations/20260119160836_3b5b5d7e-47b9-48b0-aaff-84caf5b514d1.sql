-- Create personal_tests table for individual test results from Holihope
CREATE TABLE IF NOT EXISTS public.personal_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_date DATE,
  subject TEXT,
  level TEXT,
  score NUMERIC,
  max_score NUMERIC,
  percentage NUMERIC,
  passed BOOLEAN DEFAULT false,
  comments TEXT,
  organization_id UUID REFERENCES public.organizations(id),
  external_id TEXT,
  holihope_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index for upsert
CREATE UNIQUE INDEX IF NOT EXISTS personal_tests_external_id_org_idx 
ON public.personal_tests (external_id, organization_id) 
WHERE external_id IS NOT NULL;

-- Create index for student lookups
CREATE INDEX IF NOT EXISTS personal_tests_student_id_idx ON public.personal_tests (student_id);

-- Enable RLS
ALTER TABLE public.personal_tests ENABLE ROW LEVEL SECURITY;

-- RLS policy for authenticated users
CREATE POLICY "Users can view personal tests" 
ON public.personal_tests 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert personal tests" 
ON public.personal_tests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update personal tests" 
ON public.personal_tests 
FOR UPDATE 
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_personal_tests_updated_at
BEFORE UPDATE ON public.personal_tests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();