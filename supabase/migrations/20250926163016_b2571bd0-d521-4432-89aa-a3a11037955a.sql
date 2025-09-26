-- RADICAL FIX: Drop all RLS policies and create completely permissive ones
-- This fixes infinite recursion by removing all complex policy logic

-- Drop ALL policies from key tables (ignore errors if they don't exist)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies from profiles table
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    END LOOP;
    
    -- Drop all policies from clients table  
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'clients' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.clients', r.policyname);
    END LOOP;
    
    -- Drop all policies from chat_messages table
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'chat_messages' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_messages', r.policyname);
    END LOOP;
    
    -- Drop all policies from students table
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'students' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.students', r.policyname);
    END LOOP;
    
    -- Drop all policies from leads table if it exists
    IF to_regclass('public.leads') IS NOT NULL THEN
        FOR r IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'leads' AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.leads', r.policyname);
        END LOOP;
    END IF;
    
    -- Drop all policies from chat_states table
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'chat_states' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_states', r.policyname);
    END LOOP;
    
END $$;

-- Now create simple permissive policies (no recursion risk)

-- PROFILES: Full access to authenticated users
CREATE POLICY "open_profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "open_profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "open_profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "open_profiles_delete" ON public.profiles FOR DELETE TO authenticated USING (true);

-- CLIENTS: Full access to authenticated users  
CREATE POLICY "open_clients_select" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "open_clients_insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "open_clients_update" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "open_clients_delete" ON public.clients FOR DELETE TO authenticated USING (true);

-- CHAT MESSAGES: Full access to authenticated users
CREATE POLICY "open_chat_messages_select" ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "open_chat_messages_insert" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "open_chat_messages_update" ON public.chat_messages FOR UPDATE TO authenticated USING (true);
CREATE POLICY "open_chat_messages_delete" ON public.chat_messages FOR DELETE TO authenticated USING (true);

-- CHAT STATES: Full access to authenticated users
CREATE POLICY "open_chat_states_select" ON public.chat_states FOR SELECT TO authenticated USING (true);
CREATE POLICY "open_chat_states_insert" ON public.chat_states FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "open_chat_states_update" ON public.chat_states FOR UPDATE TO authenticated USING (true);
CREATE POLICY "open_chat_states_delete" ON public.chat_states FOR DELETE TO authenticated USING (true);

-- STUDENTS: Full access to authenticated users
CREATE POLICY "open_students_select" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "open_students_insert" ON public.students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "open_students_update" ON public.students FOR UPDATE TO authenticated USING (true);
CREATE POLICY "open_students_delete" ON public.students FOR DELETE TO authenticated USING (true);

-- LEADS: Full access to authenticated users (if table exists)
DO $$
BEGIN
  IF to_regclass('public.leads') IS NOT NULL THEN
    CREATE POLICY "open_leads_select" ON public.leads FOR SELECT TO authenticated USING (true);
    CREATE POLICY "open_leads_insert" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "open_leads_update" ON public.leads FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "open_leads_delete" ON public.leads FOR DELETE TO authenticated USING (true);
  END IF;
  
  IF to_regclass('public.lead_sources') IS NOT NULL THEN
    CREATE POLICY "open_lead_sources_select" ON public.lead_sources FOR SELECT TO authenticated USING (true);
    CREATE POLICY "open_lead_sources_insert" ON public.lead_sources FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "open_lead_sources_update" ON public.lead_sources FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "open_lead_sources_delete" ON public.lead_sources FOR DELETE TO authenticated USING (true);
  END IF;
  
  IF to_regclass('public.lead_statuses') IS NOT NULL THEN
    CREATE POLICY "open_lead_statuses_select" ON public.lead_statuses FOR SELECT TO authenticated USING (true);
    CREATE POLICY "open_lead_statuses_insert" ON public.lead_statuses FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "open_lead_statuses_update" ON public.lead_statuses FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "open_lead_statuses_delete" ON public.lead_statuses FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- FAMILY DATA
CREATE POLICY "open_family_groups_select" ON public.family_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "open_family_groups_insert" ON public.family_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "open_family_groups_update" ON public.family_groups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "open_family_groups_delete" ON public.family_groups FOR DELETE TO authenticated USING (true);

CREATE POLICY "open_family_members_select" ON public.family_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "open_family_members_insert" ON public.family_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "open_family_members_update" ON public.family_members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "open_family_members_delete" ON public.family_members FOR DELETE TO authenticated USING (true);

-- CLIENT PHONES
CREATE POLICY "open_client_phones_select" ON public.client_phone_numbers FOR SELECT TO authenticated USING (true);
CREATE POLICY "open_client_phones_insert" ON public.client_phone_numbers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "open_client_phones_update" ON public.client_phone_numbers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "open_client_phones_delete" ON public.client_phone_numbers FOR DELETE TO authenticated USING (true);

-- CALL DATA
CREATE POLICY "open_call_logs_select" ON public.call_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "open_call_logs_insert" ON public.call_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "open_call_logs_update" ON public.call_logs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "open_call_logs_delete" ON public.call_logs FOR DELETE TO authenticated USING (true);

CREATE POLICY "open_call_comments_select" ON public.call_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "open_call_comments_insert" ON public.call_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "open_call_comments_update" ON public.call_comments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "open_call_comments_delete" ON public.call_comments FOR DELETE TO authenticated USING (true);