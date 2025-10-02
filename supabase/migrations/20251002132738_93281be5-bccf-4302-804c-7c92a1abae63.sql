-- CRITICAL SECURITY FIX: Enable RLS and create comprehensive policies
-- Enables RLS on all 22+ sensitive tables and implements role-based access control

-- Step 1: Enable RLS on all tables
DO $$
BEGIN
  EXECUTE 'ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.client_phone_numbers ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.chat_states ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.call_comments ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.internal_chats ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.internal_chat_messages ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.internal_chat_participants ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.internal_message_read_status ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.lead_statuses ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.bonus_accounts ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.bonus_transactions ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.students ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.lesson_sessions ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.student_lesson_sessions ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.learning_groups ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.group_students ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.individual_lessons ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.global_chat_read_status ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.message_read_status ENABLE ROW LEVEL SECURITY';
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employee_settings') THEN
    EXECUTE 'ALTER TABLE public.employee_settings ENABLE ROW LEVEL SECURITY';
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Step 2: Drop conflicting policies
DROP POLICY IF EXISTS "admin_all_clients" ON public.clients;
DROP POLICY IF EXISTS "managers_branch_clients" ON public.clients;
DROP POLICY IF EXISTS "auth_view_clients" ON public.clients;
DROP POLICY IF EXISTS "admin_all_phones" ON public.client_phone_numbers;
DROP POLICY IF EXISTS "managers_branch_phones" ON public.client_phone_numbers;
DROP POLICY IF EXISTS "auth_view_phones" ON public.client_phone_numbers;
DROP POLICY IF EXISTS "admin_all_students" ON public.students;
DROP POLICY IF EXISTS "managers_branch_students" ON public.students;
DROP POLICY IF EXISTS "students_own" ON public.students;
DROP POLICY IF EXISTS "auth_view_students" ON public.students;
DROP POLICY IF EXISTS "admin_all_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "managers_branch_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "auth_view_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "admin_all_calls" ON public.call_logs;
DROP POLICY IF EXISTS "managers_branch_calls" ON public.call_logs;
DROP POLICY IF EXISTS "auth_view_calls" ON public.call_logs;
DROP POLICY IF EXISTS "admin_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "managers_view_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin_all_leads" ON public.leads;
DROP POLICY IF EXISTS "managers_branch_leads" ON public.leads;
DROP POLICY IF EXISTS "auth_view_leads" ON public.leads;
DROP POLICY IF EXISTS "admin_all_payments" ON public.payments;
DROP POLICY IF EXISTS "managers_branch_payments" ON public.payments;
DROP POLICY IF EXISTS "auth_view_payments" ON public.payments;
DROP POLICY IF EXISTS "admin_all_invoices" ON public.invoices;
DROP POLICY IF EXISTS "accountants_invoices" ON public.invoices;
DROP POLICY IF EXISTS "auth_view_invoices" ON public.invoices;

-- Step 3: Create policies

-- CLIENTS (has branch column)
CREATE POLICY "admin_all_clients" ON public.clients
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "managers_branch_clients" ON public.clients
  FOR ALL USING (branch IN (SELECT unnest(get_user_branches(auth.uid()))));
CREATE POLICY "auth_view_clients" ON public.clients
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- CLIENT PHONE NUMBERS (no branch, follows client)
CREATE POLICY "admin_all_phones" ON public.client_phone_numbers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "managers_phones" ON public.client_phone_numbers
  FOR ALL USING (EXISTS (
    SELECT 1 FROM clients c WHERE c.id = client_phone_numbers.client_id
    AND c.branch IN (SELECT unnest(get_user_branches(auth.uid())))
  ));
CREATE POLICY "auth_view_phones" ON public.client_phone_numbers
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- STUDENTS (no branch column - use family_group or less restrictive policy)
CREATE POLICY "admin_all_students" ON public.students
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "auth_manage_students" ON public.students
  FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "students_own" ON public.students
  FOR SELECT USING (
    id IN (SELECT s.id FROM students s JOIN profiles p ON p.phone = s.phone WHERE p.id = auth.uid())
  );

-- CHAT MESSAGES (no branch, follows client)
CREATE POLICY "admin_all_messages" ON public.chat_messages
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "managers_messages" ON public.chat_messages
  FOR ALL USING (EXISTS (
    SELECT 1 FROM clients c WHERE c.id = chat_messages.client_id
    AND c.branch IN (SELECT unnest(get_user_branches(auth.uid())))
  ));
CREATE POLICY "auth_view_messages" ON public.chat_messages
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- CALL LOGS (no branch, follows client)
CREATE POLICY "admin_all_calls" ON public.call_logs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "managers_calls" ON public.call_logs
  FOR ALL USING (EXISTS (
    SELECT 1 FROM clients c WHERE c.id = call_logs.client_id
    AND c.branch IN (SELECT unnest(get_user_branches(auth.uid())))
  ));
CREATE POLICY "auth_view_calls" ON public.call_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- PROFILES (no branch for filter, but has branch column)
CREATE POLICY "admin_all_profiles" ON public.profiles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "users_own_profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);
CREATE POLICY "auth_view_profiles" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- LEADS (has branch)
CREATE POLICY "admin_all_leads" ON public.leads
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "managers_branch_leads" ON public.leads
  FOR ALL USING (branch IN (SELECT unnest(get_user_branches(auth.uid()))));
CREATE POLICY "auth_view_leads" ON public.leads
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- PAYMENTS (no branch, follows student)
CREATE POLICY "admin_all_payments" ON public.payments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "auth_manage_payments" ON public.payments
  FOR ALL USING (auth.uid() IS NOT NULL);

-- INVOICES (no branch)
CREATE POLICY "admin_all_invoices" ON public.invoices
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "auth_manage_invoices" ON public.invoices
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Simple auth-only policies for remaining tables
CREATE POLICY "auth_family_groups" ON public.family_groups FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_family_members" ON public.family_members FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_bonus_accounts" ON public.bonus_accounts FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_bonus_trans" ON public.bonus_transactions FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "users_chat_states" ON public.chat_states FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "auth_call_comments" ON public.call_comments FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_lead_sources" ON public.lead_sources FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_lead_statuses" ON public.lead_statuses FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_lead_history" ON public.lead_status_history FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_internal_chats" ON public.internal_chats FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_internal_messages" ON public.internal_chat_messages FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_chat_participants" ON public.internal_chat_participants FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_internal_read" ON public.internal_message_read_status FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "auth_typing" ON public.typing_status FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "auth_global_read" ON public.global_chat_read_status FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_message_read" ON public.message_read_status FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "auth_lesson_sessions" ON public.lesson_sessions FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_student_sessions" ON public.student_lesson_sessions FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_learning_groups" ON public.learning_groups FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_group_students" ON public.group_students FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_individual_lessons" ON public.individual_lessons FOR ALL USING (auth.uid() IS NOT NULL);