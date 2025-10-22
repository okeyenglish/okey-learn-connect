-- Delete all student-related data before deleting students
-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- Delete from existing tables
DELETE FROM public.group_students WHERE TRUE;
DELETE FROM public.balance_transactions WHERE TRUE;
DELETE FROM public.bonus_transactions WHERE TRUE;
DELETE FROM public.bonus_accounts WHERE TRUE;
DELETE FROM public.individual_lesson_sessions WHERE TRUE;

-- Now delete students
DELETE FROM public.students WHERE TRUE;

-- Re-enable triggers
SET session_replication_role = 'origin';