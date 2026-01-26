-- Add DELETE policy for trial lesson requests
CREATE POLICY "Admins can delete trial requests"
ON public.trial_lesson_requests
FOR DELETE
USING (
  (organization_id = get_user_organization_id() OR organization_id IS NULL)
  AND is_admin()
);