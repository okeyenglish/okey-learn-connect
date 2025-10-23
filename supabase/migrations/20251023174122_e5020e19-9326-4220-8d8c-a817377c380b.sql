-- Create employees table for office staff (managers, methodists, etc.)
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  email TEXT,
  phone TEXT,
  position TEXT, -- Должность: менеджер, методист, администратор и т.п.
  branch TEXT,
  department TEXT,
  hire_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  external_id TEXT UNIQUE, -- ID из Holihope
  holihope_metadata JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees
CREATE POLICY "Admins and managers can view employees"
  ON public.employees FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'branch_manager') OR
    has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can manage employees"
  ON public.employees FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'branch_manager')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'branch_manager')
  );

-- Create indexes
CREATE INDEX idx_employees_organization ON public.employees(organization_id);
CREATE INDEX idx_employees_external_id ON public.employees(external_id);
CREATE INDEX idx_employees_email ON public.employees(email);
CREATE INDEX idx_employees_phone ON public.employees(phone);
CREATE INDEX idx_employees_branch ON public.employees(branch);
CREATE INDEX idx_employees_is_active ON public.employees(is_active);

-- Add trigger for updated_at
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE public.employees IS 'Сотрудники офиса: менеджеры, методисты, администраторы и другой офисный персонал (не преподаватели)';