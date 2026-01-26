-- Create table for trial lesson requests from website
CREATE TABLE public.trial_lesson_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  comment TEXT,
  branch_name TEXT NOT NULL,
  branch_address TEXT,
  source TEXT DEFAULT 'website',
  status TEXT DEFAULT 'new',
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trial_lesson_requests ENABLE ROW LEVEL SECURITY;

-- Policy for public insert (anonymous website visitors)
CREATE POLICY "Anyone can create trial lesson requests" 
ON public.trial_lesson_requests 
FOR INSERT 
WITH CHECK (true);

-- Policy for organization staff to view their requests
CREATE POLICY "Organization staff can view their requests" 
ON public.trial_lesson_requests 
FOR SELECT 
USING (organization_id = public.get_user_organization_id() OR organization_id IS NULL);

-- Policy for organization staff to update requests
CREATE POLICY "Organization staff can update their requests" 
ON public.trial_lesson_requests 
FOR UPDATE 
USING (organization_id = public.get_user_organization_id() OR organization_id IS NULL);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_trial_lesson_requests_updated_at
BEFORE UPDATE ON public.trial_lesson_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();