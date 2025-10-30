-- Create homework table
CREATE TABLE public.homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_session_id UUID REFERENCES public.lesson_sessions(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.learning_groups(id) ON DELETE CASCADE,
  assignment TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  show_in_student_portal BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  organization_id UUID NOT NULL DEFAULT get_user_organization_id(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_homework table to track individual student completion
CREATE TABLE public.student_homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'reviewed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  teacher_notes TEXT,
  student_notes TEXT,
  grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(homework_id, student_id)
);

-- Add indexes
CREATE INDEX idx_homework_lesson_session ON public.homework(lesson_session_id);
CREATE INDEX idx_homework_group ON public.homework(group_id);
CREATE INDEX idx_homework_organization ON public.homework(organization_id);
CREATE INDEX idx_student_homework_homework ON public.student_homework(homework_id);
CREATE INDEX idx_student_homework_student ON public.student_homework(student_id);
CREATE INDEX idx_student_homework_status ON public.student_homework(status);

-- Enable RLS
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_homework ENABLE ROW LEVEL SECURITY;

-- RLS policies for homework table
CREATE POLICY "Users can view homework in their organization"
  ON public.homework FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Teachers can create homework"
  ON public.homework FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization_id() 
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'teacher'::app_role)
      OR has_role(auth.uid(), 'methodist'::app_role)
    )
  );

CREATE POLICY "Teachers can update their homework"
  ON public.homework FOR UPDATE
  USING (
    organization_id = get_user_organization_id() 
    AND (
      created_by = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'methodist'::app_role)
    )
  );

CREATE POLICY "Teachers can delete their homework"
  ON public.homework FOR DELETE
  USING (
    organization_id = get_user_organization_id() 
    AND (
      created_by = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'methodist'::app_role)
    )
  );

-- RLS policies for student_homework table
CREATE POLICY "Users can view student homework in their organization"
  ON public.student_homework FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.homework h 
      WHERE h.id = student_homework.homework_id 
      AND h.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Teachers can manage student homework"
  ON public.student_homework FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.homework h 
      WHERE h.id = student_homework.homework_id 
      AND h.organization_id = get_user_organization_id()
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'teacher'::app_role)
        OR has_role(auth.uid(), 'methodist'::app_role)
      )
    )
  );

-- Trigger to auto-update updated_at
CREATE TRIGGER update_homework_updated_at
  BEFORE UPDATE ON public.homework
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_homework_updated_at
  BEFORE UPDATE ON public.student_homework
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();