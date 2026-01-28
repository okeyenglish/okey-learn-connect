-- =============================================
-- AcademyOS CRM - Add hangup_cause and tags to call_logs
-- Run this migration on self-hosted Supabase
-- =============================================

-- Step 1: Add hangup_cause column
ALTER TABLE public.call_logs 
  ADD COLUMN IF NOT EXISTS hangup_cause TEXT;

-- Step 2: Add tags column (array of text)
ALTER TABLE public.call_logs 
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Step 3: Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_call_logs_hangup_cause 
  ON public.call_logs(hangup_cause);

CREATE INDEX IF NOT EXISTS idx_call_logs_tags 
  ON public.call_logs USING GIN(tags);

-- Step 4: Add comment for documentation
COMMENT ON COLUMN public.call_logs.hangup_cause IS 'Причина завершения звонка из OnlinePBX (например: NORMAL_CLEARING, USER_BUSY, NO_ANSWER)';
COMMENT ON COLUMN public.call_logs.tags IS 'Автоматические теги от AI анализа (например: hot_lead, callback_requested, complaint)';

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'call_logs' 
  AND column_name IN ('hangup_cause', 'tags');

-- ✅ Migration complete: hangup_cause and tags columns added to call_logs
