-- =============================================
-- AcademyOS CRM - Foreign Keys to auth.users
-- Run AFTER importing auth.users data
-- =============================================
--
-- IMPORTANT: Execute this script ONLY after:
-- 1. complete-schema.sql has been run
-- 2. auth.users data has been imported
--
-- =============================================

-- =============================================
-- ADD FOREIGN KEYS TO auth.users
-- =============================================

-- profiles.id -> auth.users.id
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- user_roles.user_id -> auth.users.id
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- teachers.profile_id -> auth.users.id (optional link)
ALTER TABLE public.teachers
ADD CONSTRAINT teachers_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- message_read_status.user_id -> auth.users.id
ALTER TABLE public.message_read_status
ADD CONSTRAINT message_read_status_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- global_chat_read_status.user_id -> auth.users.id
ALTER TABLE public.global_chat_read_status
ADD CONSTRAINT global_chat_read_status_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- assistant_threads.owner_id -> auth.users.id
ALTER TABLE public.assistant_threads
ADD CONSTRAINT assistant_threads_owner_id_fkey
FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- pinned_modals.user_id -> auth.users.id
ALTER TABLE public.pinned_modals
ADD CONSTRAINT pinned_modals_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- push_subscriptions.user_id -> auth.users.id
ALTER TABLE public.push_subscriptions
ADD CONSTRAINT push_subscriptions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- audit_log.changed_by -> auth.users.id
ALTER TABLE public.audit_log
ADD CONSTRAINT audit_log_changed_by_fkey
FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- notifications.user_id -> auth.users.id
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- documents.created_by -> auth.users.id
ALTER TABLE public.documents
ADD CONSTRAINT documents_created_by_fkey
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- typing_status.user_id -> auth.users.id
ALTER TABLE public.typing_status
ADD CONSTRAINT typing_status_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- internal_chat_participants.user_id -> auth.users.id
ALTER TABLE public.internal_chat_participants
ADD CONSTRAINT internal_chat_participants_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- internal_chat_messages.sender_id -> auth.users.id
ALTER TABLE public.internal_chat_messages
ADD CONSTRAINT internal_chat_messages_sender_id_fkey
FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- internal_chats.created_by -> auth.users.id
ALTER TABLE public.internal_chats
ADD CONSTRAINT internal_chats_created_by_fkey
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- tasks.assignee_id already references profiles(id)
-- tasks.created_by -> auth.users.id
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_created_by_fkey
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- call_logs.initiated_by -> auth.users.id
ALTER TABLE public.call_logs
ADD CONSTRAINT call_logs_initiated_by_fkey
FOREIGN KEY (initiated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- call_comments.created_by -> auth.users.id
ALTER TABLE public.call_comments
ADD CONSTRAINT call_comments_created_by_fkey
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- broadcast_campaigns.created_by -> auth.users.id
ALTER TABLE public.broadcast_campaigns
ADD CONSTRAINT broadcast_campaigns_created_by_fkey
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- payments.processed_by -> auth.users.id
ALTER TABLE public.payments
ADD CONSTRAINT payments_processed_by_fkey
FOREIGN KEY (processed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- teacher_payments.created_by -> auth.users.id
ALTER TABLE public.teacher_payments
ADD CONSTRAINT teacher_payments_created_by_fkey
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- payroll_monthly.approved_by -> auth.users.id
ALTER TABLE public.payroll_monthly
ADD CONSTRAINT payroll_monthly_approved_by_fkey
FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- teacher_substitutions.approved_by -> auth.users.id
ALTER TABLE public.teacher_substitutions
ADD CONSTRAINT teacher_substitutions_approved_by_fkey
FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- student_attendance.marked_by -> auth.users.id
ALTER TABLE public.student_attendance
ADD CONSTRAINT student_attendance_marked_by_fkey
FOREIGN KEY (marked_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- apps.author_id -> auth.users.id
ALTER TABLE public.apps
ADD CONSTRAINT apps_author_id_fkey
FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- app_installs.teacher_id -> auth.users.id
ALTER TABLE public.app_installs
ADD CONSTRAINT app_installs_teacher_id_fkey
FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- app_reviews.teacher_id -> auth.users.id
ALTER TABLE public.app_reviews
ADD CONSTRAINT app_reviews_teacher_id_fkey
FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- app_usage.teacher_id -> auth.users.id
ALTER TABLE public.app_usage
ADD CONSTRAINT app_usage_teacher_id_fkey
FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- app_flags.teacher_id -> auth.users.id
ALTER TABLE public.app_flags
ADD CONSTRAINT app_flags_teacher_id_fkey
FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- =============================================
-- VERIFICATION
-- =============================================

SELECT 'Foreign keys to auth.users added successfully!' as status;

-- List all FK constraints referencing auth.users
SELECT 
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_schema = 'auth'
  AND ccu.table_name = 'users'
ORDER BY tc.table_name;
