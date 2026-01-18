-- Create holihope_import_progress table (similar to salebot_import_progress)
CREATE TABLE IF NOT EXISTS public.holihope_import_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_running BOOLEAN DEFAULT false,
  is_paused BOOLEAN DEFAULT false,
  requires_manual_restart BOOLEAN DEFAULT false,
  current_step INTEGER DEFAULT 1,
  current_offset INTEGER DEFAULT 0,
  last_sync_timestamp TIMESTAMP WITH TIME ZONE,
  start_time TIMESTAMP WITH TIME ZONE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  -- Counters
  total_branches_imported INTEGER DEFAULT 0,
  total_teachers_imported INTEGER DEFAULT 0,
  total_leads_imported INTEGER DEFAULT 0,
  total_students_imported INTEGER DEFAULT 0,
  total_groups_imported INTEGER DEFAULT 0,
  -- Error tracking
  errors JSONB DEFAULT '[]'::jsonb,
  last_error TEXT,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.holihope_import_progress ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view and update
CREATE POLICY "Authenticated users can view holihope progress" 
ON public.holihope_import_progress 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert holihope progress" 
ON public.holihope_import_progress 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update holihope progress" 
ON public.holihope_import_progress 
FOR UPDATE 
TO authenticated
USING (true);

-- Create trigger for automatic timestamp updates (reuse existing function if available)
CREATE TRIGGER update_holihope_import_progress_updated_at
BEFORE UPDATE ON public.holihope_import_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial row
INSERT INTO public.holihope_import_progress (id) 
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;