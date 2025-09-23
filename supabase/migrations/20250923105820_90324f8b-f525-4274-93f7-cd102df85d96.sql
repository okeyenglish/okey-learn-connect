-- Create table for pending GPT responses
CREATE TABLE public.pending_gpt_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  messages_context JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '1 hour'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approved_by UUID,
  sent_at TIMESTAMP WITH TIME ZONE,
  original_response TEXT
);

-- Enable RLS
ALTER TABLE public.pending_gpt_responses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view pending responses for their branch clients"
ON public.pending_gpt_responses
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM clients c, profiles p
  WHERE c.id = pending_gpt_responses.client_id
  AND p.id = auth.uid()
  AND (c.branch = p.branch OR EXISTS (
    SELECT 1 FROM manager_branches mb
    WHERE mb.manager_id = auth.uid() AND mb.branch = c.branch
  ))
));

CREATE POLICY "Users can update pending responses for their branch clients"
ON public.pending_gpt_responses
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM clients c, profiles p
  WHERE c.id = pending_gpt_responses.client_id
  AND p.id = auth.uid()
  AND (c.branch = p.branch OR EXISTS (
    SELECT 1 FROM manager_branches mb
    WHERE mb.manager_id = auth.uid() AND mb.branch = c.branch
  ))
));

-- Create index for better performance
CREATE INDEX idx_pending_gpt_responses_client_status ON public.pending_gpt_responses(client_id, status);
CREATE INDEX idx_pending_gpt_responses_expires_at ON public.pending_gpt_responses(expires_at);

-- Add trigger for updating timestamps
CREATE TRIGGER update_pending_gpt_responses_updated_at
  BEFORE UPDATE ON public.pending_gpt_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();