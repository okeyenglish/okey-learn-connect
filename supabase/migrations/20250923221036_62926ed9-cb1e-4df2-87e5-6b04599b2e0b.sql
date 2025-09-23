-- Create table for call comments
CREATE TABLE public.call_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_log_id UUID REFERENCES public.call_logs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.call_comments ENABLE ROW LEVEL SECURITY;

-- Users can view call comments for their branch clients
CREATE POLICY "Users can view call comments for their branch clients" 
ON public.call_comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM clients c, profiles p
    WHERE c.id = call_comments.client_id 
    AND p.id = auth.uid() 
    AND (
      c.branch = p.branch 
      OR EXISTS (
        SELECT 1 FROM manager_branches mb 
        WHERE mb.manager_id = auth.uid() 
        AND mb.branch = c.branch
      )
    )
  )
);

-- Users can create call comments for their branch clients
CREATE POLICY "Users can create call comments for their branch clients" 
ON public.call_comments 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 
    FROM clients c, profiles p
    WHERE c.id = call_comments.client_id 
    AND p.id = auth.uid() 
    AND (
      c.branch = p.branch 
      OR EXISTS (
        SELECT 1 FROM manager_branches mb 
        WHERE mb.manager_id = auth.uid() 
        AND mb.branch = c.branch
      )
    )
  )
);

-- Users can update their own call comments for their branch clients
CREATE POLICY "Users can update their own call comments for their branch clients" 
ON public.call_comments 
FOR UPDATE 
USING (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 
    FROM clients c, profiles p
    WHERE c.id = call_comments.client_id 
    AND p.id = auth.uid() 
    AND (
      c.branch = p.branch 
      OR EXISTS (
        SELECT 1 FROM manager_branches mb 
        WHERE mb.manager_id = auth.uid() 
        AND mb.branch = c.branch
      )
    )
  )
);

-- Users can delete their own call comments for their branch clients
CREATE POLICY "Users can delete their own call comments for their branch clients" 
ON public.call_comments 
FOR DELETE 
USING (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 
    FROM clients c, profiles p
    WHERE c.id = call_comments.client_id 
    AND p.id = auth.uid() 
    AND (
      c.branch = p.branch 
      OR EXISTS (
        SELECT 1 FROM manager_branches mb 
        WHERE mb.manager_id = auth.uid() 
        AND mb.branch = c.branch
      )
    )
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_call_comments_updated_at
BEFORE UPDATE ON public.call_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_call_comments_client_id ON public.call_comments(client_id);
CREATE INDEX idx_call_comments_call_log_id ON public.call_comments(call_log_id);