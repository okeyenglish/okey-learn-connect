-- Clear all existing CRM-related policies and create simple permissive ones

-- DISABLE RLS ON CRITICAL TABLES (simplest approach)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;  
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_states DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_phone_numbers DISABLE ROW LEVEL SECURITY;

-- Disable RLS on leads/statuses/sources tables if they exist
DO $$
BEGIN
  IF to_regclass('public.leads') IS NOT NULL THEN
    ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.lead_sources') IS NOT NULL THEN
    ALTER TABLE public.lead_sources DISABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.lead_statuses') IS NOT NULL THEN
    ALTER TABLE public.lead_statuses DISABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.lead_status_history') IS NOT NULL THEN
    ALTER TABLE public.lead_status_history DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable RLS on internal chats if exist
DO $$
BEGIN
  IF to_regclass('public.internal_chats') IS NOT NULL THEN
    ALTER TABLE public.internal_chats DISABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.internal_chat_messages') IS NOT NULL THEN
    ALTER TABLE public.internal_chat_messages DISABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.internal_chat_participants') IS NOT NULL THEN
    ALTER TABLE public.internal_chat_participants DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable RLS on finance tables if exist
DO $$
BEGIN
  IF to_regclass('public.invoices') IS NOT NULL THEN
    ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.payments') IS NOT NULL THEN
    ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.subscription_plans') IS NOT NULL THEN
    ALTER TABLE public.subscription_plans DISABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.subscription_transactions') IS NOT NULL THEN
    ALTER TABLE public.subscription_transactions DISABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.subscription_freezes') IS NOT NULL THEN
    ALTER TABLE public.subscription_freezes DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;