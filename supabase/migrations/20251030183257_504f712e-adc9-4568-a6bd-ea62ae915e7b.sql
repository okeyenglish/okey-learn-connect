-- Add RLS policy for students to view their own homework
CREATE POLICY "Students can view their own homework"
  ON public.student_homework FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM public.students 
      WHERE phone IN (
        SELECT phone FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Add policy for students to update their own homework status
CREATE POLICY "Students can update their own homework"
  ON public.student_homework FOR UPDATE
  USING (
    student_id IN (
      SELECT id FROM public.students 
      WHERE phone IN (
        SELECT phone FROM public.profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM public.students 
      WHERE phone IN (
        SELECT phone FROM public.profiles WHERE id = auth.uid()
      )
    )
  );