-- Create call logs table
CREATE TABLE public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'answered', 'missed', 'busy', 'failed')),
  duration_seconds INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  initiated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for call logs
CREATE POLICY "Users can view call logs for their branch clients" 
ON public.call_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM clients c, profiles p 
    WHERE c.id = call_logs.client_id 
    AND p.id = auth.uid() 
    AND (c.branch = p.branch OR EXISTS (
      SELECT 1 FROM manager_branches mb 
      WHERE mb.manager_id = auth.uid() 
      AND mb.branch = c.branch
    ))
  )
);

CREATE POLICY "Users can create call logs for their branch clients" 
ON public.call_logs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c, profiles p 
    WHERE c.id = call_logs.client_id 
    AND p.id = auth.uid() 
    AND (c.branch = p.branch OR EXISTS (
      SELECT 1 FROM manager_branches mb 
      WHERE mb.manager_id = auth.uid() 
      AND mb.branch = c.branch
    ))
  )
);

CREATE POLICY "Users can update call logs for their branch clients" 
ON public.call_logs 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM clients c, profiles p 
    WHERE c.id = call_logs.client_id 
    AND p.id = auth.uid() 
    AND (c.branch = p.branch OR EXISTS (
      SELECT 1 FROM manager_branches mb 
      WHERE mb.manager_id = auth.uid() 
      AND mb.branch = c.branch
    ))
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_call_logs_updated_at
BEFORE UPDATE ON public.call_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_call_logs_client_id ON public.call_logs(client_id);
CREATE INDEX idx_call_logs_started_at ON public.call_logs(started_at DESC);