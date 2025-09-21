-- Create table for linking students to lesson sessions
CREATE TABLE IF NOT EXISTS public.student_lesson_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  lesson_session_id UUID NOT NULL REFERENCES public.lesson_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, lesson_session_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_lesson_sessions_student_id ON public.student_lesson_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_lesson_sessions_lesson_session_id ON public.student_lesson_sessions(lesson_session_id);

-- Enable RLS
ALTER TABLE public.student_lesson_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view student sessions from their branches" ON public.student_lesson_sessions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM lesson_sessions ls
    JOIN profiles p ON p.id = auth.uid()
    WHERE ls.id = student_lesson_sessions.lesson_session_id
    AND (ls.branch = p.branch OR EXISTS (
      SELECT 1 FROM manager_branches mb 
      WHERE mb.manager_id = auth.uid() AND mb.branch = ls.branch
    ))
  )
);

CREATE POLICY "Users can insert student sessions to their branches" ON public.student_lesson_sessions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM lesson_sessions ls
    JOIN profiles p ON p.id = auth.uid()
    WHERE ls.id = student_lesson_sessions.lesson_session_id
    AND (ls.branch = p.branch OR EXISTS (
      SELECT 1 FROM manager_branches mb 
      WHERE mb.manager_id = auth.uid() AND mb.branch = ls.branch
    ))
  )
);

CREATE POLICY "Users can update student sessions from their branches" ON public.student_lesson_sessions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM lesson_sessions ls
    JOIN profiles p ON p.id = auth.uid()
    WHERE ls.id = student_lesson_sessions.lesson_session_id
    AND (ls.branch = p.branch OR EXISTS (
      SELECT 1 FROM manager_branches mb 
      WHERE mb.manager_id = auth.uid() AND mb.branch = ls.branch
    ))
  )
);

CREATE POLICY "Users can delete student sessions from their branches" ON public.student_lesson_sessions
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM lesson_sessions ls
    JOIN profiles p ON p.id = auth.uid()
    WHERE ls.id = student_lesson_sessions.lesson_session_id
    AND (ls.branch = p.branch OR EXISTS (
      SELECT 1 FROM manager_branches mb 
      WHERE mb.manager_id = auth.uid() AND mb.branch = ls.branch
    ))
  )
);

-- Function to check student conflicts
CREATE OR REPLACE FUNCTION public.check_student_conflict(
  p_student_id UUID,
  p_lesson_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_session_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.student_lesson_sessions sls
    JOIN public.lesson_sessions ls ON ls.id = sls.lesson_session_id
    WHERE sls.student_id = p_student_id
    AND ls.lesson_date = p_lesson_date
    AND ls.status != 'cancelled'
    AND (p_exclude_session_id IS NULL OR ls.id != p_exclude_session_id)
    AND (
      (ls.start_time <= p_start_time AND ls.end_time > p_start_time) OR
      (ls.start_time < p_end_time AND ls.end_time >= p_end_time) OR
      (ls.start_time >= p_start_time AND ls.end_time <= p_end_time)
    )
  );
END;
$$;

-- Function to get student schedule conflicts with details
CREATE OR REPLACE FUNCTION public.get_student_schedule_conflicts(
  p_student_id UUID,
  p_lesson_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_session_id UUID DEFAULT NULL
)
RETURNS TABLE(
  conflict_session_id UUID,
  conflicting_group_name TEXT,
  conflicting_teacher TEXT,
  conflicting_classroom TEXT,
  conflicting_branch TEXT,
  conflicting_time_range TEXT,
  lesson_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ls.id as conflict_session_id,
    COALESCE(lg.name, 'Индивидуальное занятие') as conflicting_group_name,
    ls.teacher_name as conflicting_teacher,
    ls.classroom as conflicting_classroom,
    ls.branch as conflicting_branch,
    (ls.start_time::TEXT || ' - ' || ls.end_time::TEXT) as conflicting_time_range,
    CASE 
      WHEN lg.id IS NOT NULL THEN 'group'
      ELSE 'individual'
    END as lesson_type
  FROM public.student_lesson_sessions sls
  JOIN public.lesson_sessions ls ON ls.id = sls.lesson_session_id
  LEFT JOIN public.learning_groups lg ON lg.id = ls.group_id
  WHERE sls.student_id = p_student_id
    AND ls.lesson_date = p_lesson_date
    AND ls.status != 'cancelled'
    AND (p_exclude_session_id IS NULL OR ls.id != p_exclude_session_id)
    AND (
      (ls.start_time <= p_start_time AND ls.end_time > p_start_time) OR
      (ls.start_time < p_end_time AND ls.end_time >= p_end_time) OR
      (ls.start_time >= p_start_time AND ls.end_time <= p_end_time)
    );
END;
$$;

-- Function to get multiple students conflicts at once
CREATE OR REPLACE FUNCTION public.check_multiple_students_conflicts(
  p_student_ids UUID[],
  p_lesson_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_session_id UUID DEFAULT NULL
)
RETURNS TABLE(
  student_id UUID,
  has_conflict BOOLEAN,
  conflict_details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_uuid UUID;
  conflict_data JSONB;
BEGIN
  FOREACH student_uuid IN ARRAY p_student_ids
  LOOP
    SELECT jsonb_agg(
      jsonb_build_object(
        'session_id', conflict_session_id,
        'group_name', conflicting_group_name,
        'teacher', conflicting_teacher,
        'classroom', conflicting_classroom,
        'branch', conflicting_branch,
        'time_range', conflicting_time_range,
        'lesson_type', lesson_type
      )
    )
    INTO conflict_data
    FROM public.get_student_schedule_conflicts(
      student_uuid,
      p_lesson_date,
      p_start_time,
      p_end_time,
      p_exclude_session_id
    );
    
    RETURN QUERY
    SELECT 
      student_uuid,
      (conflict_data IS NOT NULL AND jsonb_array_length(conflict_data) > 0),
      COALESCE(conflict_data, '[]'::jsonb);
  END LOOP;
END;
$$;

-- Update trigger for student_lesson_sessions
CREATE TRIGGER update_student_lesson_sessions_updated_at
  BEFORE UPDATE ON public.student_lesson_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();