-- Add DELETE policy for pending_gpt_responses table
CREATE POLICY "Users can delete pending responses for their branch clients" 
ON public.pending_gpt_responses 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1
    FROM clients c,
    profiles p
    WHERE c.id = pending_gpt_responses.client_id 
    AND p.id = auth.uid() 
    AND (
      c.branch = p.branch 
      OR EXISTS (
        SELECT 1
        FROM manager_branches mb
        WHERE mb.manager_id = auth.uid() 
        AND mb.branch = c.branch
      )
    )
  )
);