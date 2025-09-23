-- Add external_call_id column to call_logs table to store OnlinePBX call ID
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS external_call_id TEXT;

-- Add index for better performance when searching by external_call_id
CREATE INDEX IF NOT EXISTS idx_call_logs_external_call_id 
ON public.call_logs(external_call_id) 
WHERE external_call_id IS NOT NULL;