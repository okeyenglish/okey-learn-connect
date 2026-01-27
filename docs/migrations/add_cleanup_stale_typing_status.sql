-- Migration: Server-side cleanup for stale typing_status
-- Run this on self-hosted Supabase (api.academyos.ru)
-- Date: 2026-01-27

-- Create function to clean up stale typing statuses (older than 10 seconds)
CREATE OR REPLACE FUNCTION public.cleanup_stale_typing_status()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  UPDATE public.typing_status
  SET is_typing = false
  WHERE is_typing = true
    AND updated_at < (NOW() - INTERVAL '10 seconds');
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  RETURN cleaned_count;
END;
$$;

-- Grant execute permission to service_role for pg_cron jobs
GRANT EXECUTE ON FUNCTION public.cleanup_stale_typing_status() TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.cleanup_stale_typing_status() IS 'Cleans up stale typing indicators older than 10 seconds to prevent stuck indicators';

-- Optional: Create pg_cron job to run every 5 seconds (requires pg_cron extension)
-- Uncomment if pg_cron is available:
-- SELECT cron.schedule(
--   'cleanup-stale-typing',
--   '*/5 * * * *',  -- Every minute (pg_cron minimum interval)
--   $$SELECT public.cleanup_stale_typing_status()$$
-- );

-- Alternative: Use pg_cron with seconds via pg_cron.schedule_in_database (if available)
-- For more frequent cleanup, consider calling this function from the Edge Function router

-- Verify function was created
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'cleanup_stale_typing_status';
