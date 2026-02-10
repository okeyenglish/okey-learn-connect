-- Migration: Reduce Realtime Publication to essential tables only
-- Run on self-hosted Supabase (api.academyos.ru)
-- Date: 2026-02-10
-- Purpose: Cut WAL decoding overhead by ~75% (1656 calls/15min → ~400)
--
-- Tables KEPT in publication:
--   chat_messages, tasks, lesson_sessions, chat_states,
--   internal_chat_messages, notifications
--
-- Tables REMOVED (already on polling/broadcast or no frontend listener)

DO $$
DECLARE
  _tbl text;
BEGIN
  FOREACH _tbl IN ARRAY ARRAY[
    'typing_status',
    'chat_presence',
    'global_chat_read_status',
    'pinned_modals',
    'staff_activity_log',
    'clients',
    'student_attendance',
    'student_lesson_sessions',
    'whatsapp_sessions',
    'pending_gpt_responses',
    'payments',
    'individual_lesson_sessions',
    'teacher_messages',
    'assistant_messages',
    'call_logs'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = _tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', _tbl);
      RAISE NOTICE 'Dropped % from supabase_realtime', _tbl;
    ELSE
      RAISE NOTICE 'Skipping % (not in publication)', _tbl;
    END IF;
  END LOOP;
END;
$$;

-- Ensure high-write tables use DEFAULT replica identity (not FULL)
ALTER TABLE public.chat_messages REPLICA IDENTITY DEFAULT;
ALTER TABLE public.chat_states REPLICA IDENTITY DEFAULT;
ALTER TABLE public.tasks REPLICA IDENTITY DEFAULT;
ALTER TABLE public.lesson_sessions REPLICA IDENTITY DEFAULT;
ALTER TABLE public.internal_chat_messages REPLICA IDENTITY DEFAULT;
ALTER TABLE public.notifications REPLICA IDENTITY DEFAULT;

-- Verify remaining publication tables:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
