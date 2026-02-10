-- Migration: Reduce Realtime Publication to essential tables only
-- Run on self-hosted Supabase (api.academyos.ru)
-- Date: 2026-02-10
-- Purpose: Cut WAL decoding overhead by ~75% (1656 calls/15min → ~400)
--
-- Tables KEPT in publication:
--   chat_messages, tasks, lesson_sessions, chat_states,
--   internal_chat_messages, notifications
--
-- Tables REMOVED (already on polling/broadcast or no frontend listener):

-- Already uses Broadcast API
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.typing_status;

-- Already uses polling
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.chat_presence;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.global_chat_read_status;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.pinned_modals;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.staff_activity_log;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.clients;

-- No active frontend realtime listener
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.student_attendance;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.student_lesson_sessions;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.whatsapp_sessions;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.pending_gpt_responses;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.payments;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.individual_lesson_sessions;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.teacher_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.assistant_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.call_logs;

-- Ensure high-write tables use DEFAULT replica identity (not FULL)
-- FULL sends entire row on every UPDATE = extremely expensive WAL
ALTER TABLE public.chat_messages REPLICA IDENTITY DEFAULT;
ALTER TABLE public.chat_states REPLICA IDENTITY DEFAULT;
ALTER TABLE public.tasks REPLICA IDENTITY DEFAULT;
ALTER TABLE public.lesson_sessions REPLICA IDENTITY DEFAULT;
ALTER TABLE public.internal_chat_messages REPLICA IDENTITY DEFAULT;
ALTER TABLE public.notifications REPLICA IDENTITY DEFAULT;

-- Verify remaining publication tables:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
