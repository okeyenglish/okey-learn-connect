-- Migration: Add draft_text and manager_name to typing_status
-- Run this on self-hosted Supabase (api.academyos.ru)
-- Date: 2026-01-26

-- Add columns for draft text preview and manager name
ALTER TABLE public.typing_status
ADD COLUMN IF NOT EXISTS draft_text TEXT,
ADD COLUMN IF NOT EXISTS manager_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.typing_status.draft_text IS 'First 100 characters of draft message for real-time preview';
COMMENT ON COLUMN public.typing_status.manager_name IS 'Display name of the typing manager';

-- Verify changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'typing_status'
ORDER BY ordinal_position;
