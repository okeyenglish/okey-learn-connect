-- Add summary and notes fields to call_logs table
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Drop existing trigger if exists and recreate it
DROP TRIGGER IF EXISTS update_call_logs_updated_at ON public.call_logs;
CREATE TRIGGER update_call_logs_updated_at
    BEFORE UPDATE ON public.call_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();