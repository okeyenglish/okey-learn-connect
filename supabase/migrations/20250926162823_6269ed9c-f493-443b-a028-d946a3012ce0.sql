-- RADICAL: Open CRM data access to all authenticated users (temporary)
-- WARNING: This grants broad access; intended as temporary fix per user request

-- Helper: function exists; we avoid recursion by not referencing other tables in USING/with check

-- List of tables to relax: profiles, clients, client_phone_numbers, chat_messages, chat_states,
-- family_groups, family_members, students, student_courses, call_logs, call_comments,
-- leads, lead_sources, lead_statuses, lead_status_history, internal_chats, internal_chat_messages, internal_chat_participants,
-- invoices, payments, subscriptions (finance areas may depend on these)

-- For each table: drop existing policies and create permissive policies

-- 1) PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "crm_allow_all_select_profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_allow_all_update_profiles" ON public.profiles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "crm_allow_all_insert_profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crm_allow_all_delete_profiles" ON public.profiles FOR DELETE TO authenticated USING (true);

-- 2) CLIENTS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "Allow system chat operations" ON public.clients;
DROP POLICY IF EXISTS "System chat clients are viewable by authenticated users" ON public.clients;
DROP POLICY IF EXISTS "System chat clients can be created by authenticated users" ON public.clients;
DROP POLICY IF EXISTS "System chat clients can be updated by authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients from their branches" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients to their branches" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients from their branches" ON public.clients;
DROP POLICY IF EXISTS "Users can view clients from their branches" ON public.clients;
DROP POLICY IF EXISTS "Users can view clients linked to chat messages" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can view all active clients" ON public.clients;
CREATE POLICY "crm_allow_all_select_clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_allow_all_insert_clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crm_allow_all_update_clients" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "crm_allow_all_delete_clients" ON public.clients FOR DELETE TO authenticated USING (true);

-- 3) CLIENT PHONE NUMBERS
ALTER TABLE public.client_phone_numbers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on client_phone_numbers" ON public.client_phone_numbers;
CREATE POLICY "crm_allow_all_select_client_phones" ON public.client_phone_numbers FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_allow_all_insert_client_phones" ON public.client_phone_numbers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crm_allow_all_update_client_phones" ON public.client_phone_numbers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "crm_allow_all_delete_client_phones" ON public.client_phone_numbers FOR DELETE TO authenticated USING (true);

-- 4) CHAT MESSAGES
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can create chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can update chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can delete chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow all operations on chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "System chat messages operations" ON public.chat_messages;
CREATE POLICY "crm_allow_all_select_chat_messages" ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_allow_all_insert_chat_messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crm_allow_all_update_chat_messages" ON public.chat_messages FOR UPDATE TO authenticated USING (true);
CREATE POLICY "crm_allow_all_delete_chat_messages" ON public.chat_messages FOR DELETE TO authenticated USING (true);

-- 5) CHAT STATES
ALTER TABLE public.chat_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can create their own chat states" ON public.chat_states;
DROP POLICY IF EXISTS "Users can delete their own chat states" ON public.chat_states;
DROP POLICY IF EXISTS "Users can update their own chat states" ON public.chat_states;
DROP POLICY IF EXISTS "Users can view their own chat states" ON public.chat_states;
CREATE POLICY "crm_allow_all_select_chat_states" ON public.chat_states FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_allow_all_insert_chat_states" ON public.chat_states FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crm_allow_all_update_chat_states" ON public.chat_states FOR UPDATE TO authenticated USING (true);
CREATE POLICY "crm_allow_all_delete_chat_states" ON public.chat_states FOR DELETE TO authenticated USING (true);

-- 6) FAMILY GROUPS
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on family_groups" ON public.family_groups;
CREATE POLICY "crm_allow_all_select_family_groups" ON public.family_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_allow_all_insert_family_groups" ON public.family_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crm_allow_all_update_family_groups" ON public.family_groups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "crm_allow_all_delete_family_groups" ON public.family_groups FOR DELETE TO authenticated USING (true);

-- 7) FAMILY MEMBERS
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on family_members" ON public.family_members;
CREATE POLICY "crm_allow_all_select_family_members" ON public.family_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_allow_all_insert_family_members" ON public.family_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crm_allow_all_update_family_members" ON public.family_members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "crm_allow_all_delete_family_members" ON public.family_members FOR DELETE TO authenticated USING (true);

-- 8) STUDENTS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "*" ON public.students; -- will error; instead drop known
-- Drop any common policies names if exist (safe no-op if missing)
DROP POLICY IF EXISTS "Students are viewable by everyone" ON public.students;
DROP POLICY IF EXISTS "Users can update their students" ON public.students;
DROP POLICY IF EXISTS "Users can insert students" ON public.students;
CREATE POLICY "crm_allow_all_select_students" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_allow_all_insert_students" ON public.students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crm_allow_all_update_students" ON public.students FOR UPDATE TO authenticated USING (true);
CREATE POLICY "crm_allow_all_delete_students" ON public.students FOR DELETE TO authenticated USING (true);

-- 9) STUDENT COURSES (if exists)
DO $$
BEGIN
  IF to_regclass('public.student_courses') IS NOT NULL THEN
    ALTER TABLE public.student_courses ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "crm_any_select_student_courses" ON public.student_courses;
    DROP POLICY IF EXISTS "crm_any_insert_student_courses" ON public.student_courses;
    DROP POLICY IF EXISTS "crm_any_update_student_courses" ON public.student_courses;
    DROP POLICY IF EXISTS "crm_any_delete_student_courses" ON public.student_courses;
    CREATE POLICY "crm_any_select_student_courses" ON public.student_courses FOR SELECT TO authenticated USING (true);
    CREATE POLICY "crm_any_insert_student_courses" ON public.student_courses FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "crm_any_update_student_courses" ON public.student_courses FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "crm_any_delete_student_courses" ON public.student_courses FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- 10) CALL LOGS & COMMENTS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can create call logs for their branch clients" ON public.call_logs;
DROP POLICY IF EXISTS "Users can update call logs for their branch clients" ON public.call_logs;
DROP POLICY IF EXISTS "Users can view call logs for their branch clients" ON public.call_logs;
CREATE POLICY "crm_allow_all_select_call_logs" ON public.call_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_allow_all_insert_call_logs" ON public.call_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crm_allow_all_update_call_logs" ON public.call_logs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "crm_allow_all_delete_call_logs" ON public.call_logs FOR DELETE TO authenticated USING (true);

ALTER TABLE public.call_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all call comments" ON public.call_comments;
DROP POLICY IF EXISTS "Users can create call comments for their branch clients" ON public.call_comments;
DROP POLICY IF EXISTS "Users can delete their own call comments for their branch clien" ON public.call_comments;
DROP POLICY IF EXISTS "Users can update their own call comments for their branch clien" ON public.call_comments;
DROP POLICY IF EXISTS "Users can view call comments for their branch clients" ON public.call_comments;
CREATE POLICY "crm_allow_all_select_call_comments" ON public.call_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_allow_all_insert_call_comments" ON public.call_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crm_allow_all_update_call_comments" ON public.call_comments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "crm_allow_all_delete_call_comments" ON public.call_comments FOR DELETE TO authenticated USING (true);

-- 11) LEADS & RELATED
DO $$
BEGIN
  IF to_regclass('public.leads') IS NOT NULL THEN
    ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "crm_leads_select" ON public.leads;
    DROP POLICY IF EXISTS "crm_leads_insert" ON public.leads;
    DROP POLICY IF EXISTS "crm_leads_update" ON public.leads;
    DROP POLICY IF EXISTS "crm_leads_delete" ON public.leads;
    CREATE POLICY "crm_leads_select" ON public.leads FOR SELECT TO authenticated USING (true);
    CREATE POLICY "crm_leads_insert" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "crm_leads_update" ON public.leads FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "crm_leads_delete" ON public.leads FOR DELETE TO authenticated USING (true);
  END IF;
  IF to_regclass('public.lead_sources') IS NOT NULL THEN
    ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins and managers can manage lead sources" ON public.lead_sources;
    DROP POLICY IF EXISTS "Authenticated users can view lead sources" ON public.lead_sources;
    CREATE POLICY "crm_lead_sources_select" ON public.lead_sources FOR SELECT TO authenticated USING (true);
    CREATE POLICY "crm_lead_sources_insert" ON public.lead_sources FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "crm_lead_sources_update" ON public.lead_sources FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "crm_lead_sources_delete" ON public.lead_sources FOR DELETE TO authenticated USING (true);
  END IF;
  IF to_regclass('public.lead_statuses') IS NOT NULL THEN
    ALTER TABLE public.lead_statuses ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins and managers can manage lead statuses" ON public.lead_statuses;
    DROP POLICY IF EXISTS "Authenticated users can view lead statuses" ON public.lead_statuses;
    CREATE POLICY "crm_lead_statuses_select" ON public.lead_statuses FOR SELECT TO authenticated USING (true);
    CREATE POLICY "crm_lead_statuses_insert" ON public.lead_statuses FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "crm_lead_statuses_update" ON public.lead_statuses FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "crm_lead_statuses_delete" ON public.lead_statuses FOR DELETE TO authenticated USING (true);
  END IF;
  IF to_regclass('public.lead_status_history') IS NOT NULL THEN
    ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "crm_lead_status_history_select" ON public.lead_status_history;
    DROP POLICY IF EXISTS "crm_lead_status_history_insert" ON public.lead_status_history;
    DROP POLICY IF EXISTS "crm_lead_status_history_update" ON public.lead_status_history;
    DROP POLICY IF EXISTS "crm_lead_status_history_delete" ON public.lead_status_history;
    CREATE POLICY "crm_lead_status_history_select" ON public.lead_status_history FOR SELECT TO authenticated USING (true);
    CREATE POLICY "crm_lead_status_history_insert" ON public.lead_status_history FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "crm_lead_status_history_update" ON public.lead_status_history FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "crm_lead_status_history_delete" ON public.lead_status_history FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- 12) INTERNAL CHATS
DO $$
BEGIN
  IF to_regclass('public.internal_chats') IS NOT NULL THEN
    ALTER TABLE public.internal_chats ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins can manage all internal chats" ON public.internal_chats;
    DROP POLICY IF EXISTS "Chat admins can update chats" ON public.internal_chats;
    DROP POLICY IF EXISTS "Users can create chats" ON public.internal_chats;
    DROP POLICY IF EXISTS "Users can view chats they participate in" ON public.internal_chats;
    CREATE POLICY "crm_any_select_internal_chats" ON public.internal_chats FOR SELECT TO authenticated USING (true);
    CREATE POLICY "crm_any_insert_internal_chats" ON public.internal_chats FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "crm_any_update_internal_chats" ON public.internal_chats FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "crm_any_delete_internal_chats" ON public.internal_chats FOR DELETE TO authenticated USING (true);
  END IF;
  IF to_regclass('public.internal_chat_messages') IS NOT NULL THEN
    ALTER TABLE public.internal_chat_messages ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins can manage all internal messages" ON public.internal_chat_messages;
    DROP POLICY IF EXISTS "Users can edit their own messages" ON public.internal_chat_messages;
    DROP POLICY IF EXISTS "Users can send messages to chats they participate in" ON public.internal_chat_messages;
    DROP POLICY IF EXISTS "Users can view messages from chats they participate in" ON public.internal_chat_messages;
    CREATE POLICY "crm_any_select_internal_chat_messages" ON public.internal_chat_messages FOR SELECT TO authenticated USING (true);
    CREATE POLICY "crm_any_insert_internal_chat_messages" ON public.internal_chat_messages FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "crm_any_update_internal_chat_messages" ON public.internal_chat_messages FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "crm_any_delete_internal_chat_messages" ON public.internal_chat_messages FOR DELETE TO authenticated USING (true);
  END IF;
  IF to_regclass('public.internal_chat_participants') IS NOT NULL THEN
    ALTER TABLE public.internal_chat_participants ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins can manage all internal participants" ON public.internal_chat_participants;
    DROP POLICY IF EXISTS "Chat admins can manage participants" ON public.internal_chat_participants;
    DROP POLICY IF EXISTS "Users can join chats" ON public.internal_chat_participants;
    DROP POLICY IF EXISTS "Users can view participants of chats they're in" ON public.internal_chat_participants;
    CREATE POLICY "crm_any_select_internal_chat_participants" ON public.internal_chat_participants FOR SELECT TO authenticated USING (true);
    CREATE POLICY "crm_any_insert_internal_chat_participants" ON public.internal_chat_participants FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "crm_any_update_internal_chat_participants" ON public.internal_chat_participants FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "crm_any_delete_internal_chat_participants" ON public.internal_chat_participants FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- 13) FINANCE TABLES (optional, if exist)
DO $$
BEGIN
  IF to_regclass('public.invoices') IS NOT NULL THEN
    ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins can manage all invoices" ON public.invoices;
    DROP POLICY IF EXISTS "Users can manage invoices for students they can access" ON public.invoices;
    DROP POLICY IF EXISTS "Users can view invoices for students they can access" ON public.invoices;
    CREATE POLICY "crm_any_select_invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
    CREATE POLICY "crm_any_insert_invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "crm_any_update_invoices" ON public.invoices FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "crm_any_delete_invoices" ON public.invoices FOR DELETE TO authenticated USING (true);
  END IF;
  IF to_regclass('public.payments') IS NOT NULL THEN
    ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "crm_any_select_payments" ON public.payments;
    DROP POLICY IF EXISTS "crm_any_insert_payments" ON public.payments;
    DROP POLICY IF EXISTS "crm_any_update_payments" ON public.payments;
    DROP POLICY IF EXISTS "crm_any_delete_payments" ON public.payments;
    CREATE POLICY "crm_any_select_payments" ON public.payments FOR SELECT TO authenticated USING (true);
    CREATE POLICY "crm_any_insert_payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "crm_any_update_payments" ON public.payments FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "crm_any_delete_payments" ON public.payments FOR DELETE TO authenticated USING (true);
  END IF;
  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "crm_any_select_subscriptions" ON public.subscriptions;
    DROP POLICY IF EXISTS "crm_any_insert_subscriptions" ON public.subscriptions;
    DROP POLICY IF EXISTS "crm_any_update_subscriptions" ON public.subscriptions;
    DROP POLICY IF EXISTS "crm_any_delete_subscriptions" ON public.subscriptions;
    CREATE POLICY "crm_any_select_subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (true);
    CREATE POLICY "crm_any_insert_subscriptions" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "crm_any_update_subscriptions" ON public.subscriptions FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "crm_any_delete_subscriptions" ON public.subscriptions FOR DELETE TO authenticated USING (true);
  END IF;
END $$;