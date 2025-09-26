-- Admin override policies across key CRM tables
-- Each block checks table existence and whether the policy already exists

DO $$ BEGIN
  IF to_regclass('public.clients') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'Admins can manage all clients'
    ) THEN
      CREATE POLICY "Admins can manage all clients" ON public.clients
      FOR ALL
      USING (has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'admin'));
    END IF;
  END IF;

  IF to_regclass('public.internal_chats') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'internal_chats' AND policyname = 'Admins can manage all internal chats'
    ) THEN
      CREATE POLICY "Admins can manage all internal chats" ON public.internal_chats
      FOR ALL
      USING (has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'admin'));
    END IF;
  END IF;

  IF to_regclass('public.internal_chat_messages') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'internal_chat_messages' AND policyname = 'Admins can manage all internal messages'
    ) THEN
      CREATE POLICY "Admins can manage all internal messages" ON public.internal_chat_messages
      FOR ALL
      USING (has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'admin'));
    END IF;
  END IF;

  IF to_regclass('public.internal_chat_participants') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'internal_chat_participants' AND policyname = 'Admins can manage all internal participants'
    ) THEN
      CREATE POLICY "Admins can manage all internal participants" ON public.internal_chat_participants
      FOR ALL
      USING (has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'admin'));
    END IF;
  END IF;

  IF to_regclass('public.call_logs') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'call_logs' AND policyname = 'Admins can manage all call logs'
    ) THEN
      CREATE POLICY "Admins can manage all call logs" ON public.call_logs
      FOR ALL
      USING (has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'admin'));
    END IF;
  END IF;

  IF to_regclass('public.call_comments') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'call_comments' AND policyname = 'Admins can manage all call comments'
    ) THEN
      CREATE POLICY "Admins can manage all call comments" ON public.call_comments
      FOR ALL
      USING (has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'admin'));
    END IF;
  END IF;

  IF to_regclass('public.leads') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'Admins can manage all leads'
    ) THEN
      CREATE POLICY "Admins can manage all leads" ON public.leads
      FOR ALL
      USING (has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'admin'));
    END IF;
  END IF;

  IF to_regclass('public.students') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'students' AND policyname = 'Admins can manage all students'
    ) THEN
      CREATE POLICY "Admins can manage all students" ON public.students
      FOR ALL
      USING (has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'admin'));
    END IF;
  END IF;

  IF to_regclass('public.learning_groups') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'learning_groups' AND policyname = 'Admins can manage all learning groups'
    ) THEN
      CREATE POLICY "Admins can manage all learning groups" ON public.learning_groups
      FOR ALL
      USING (has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'admin'));
    END IF;
  END IF;

  IF to_regclass('public.group_students') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'group_students' AND policyname = 'Admins can manage all group students'
    ) THEN
      CREATE POLICY "Admins can manage all group students" ON public.group_students
      FOR ALL
      USING (has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'admin'));
    END IF;
  END IF;

  IF to_regclass('public.individual_lessons') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'individual_lessons' AND policyname = 'Admins can manage all individual lessons'
    ) THEN
      CREATE POLICY "Admins can manage all individual lessons" ON public.individual_lessons
      FOR ALL
      USING (has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'admin'));
    END IF;
  END IF;

  IF to_regclass('public.invoices') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'Admins can manage all invoices'
    ) THEN
      CREATE POLICY "Admins can manage all invoices" ON public.invoices
      FOR ALL
      USING (has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'admin'));
    END IF;
  END IF;

  IF to_regclass('public.payments') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'Admins can manage all payments'
    ) THEN
      CREATE POLICY "Admins can manage all payments" ON public.payments
      FOR ALL
      USING (has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'admin'));
    END IF;
  END IF;

  IF to_regclass('public.user_roles') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Admins can manage all user roles'
    ) THEN
      CREATE POLICY "Admins can manage all user roles" ON public.user_roles
      FOR ALL
      USING (has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'admin'));
    END IF;
  END IF;

  IF to_regclass('public.role_permissions') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'role_permissions' AND policyname = 'Admins can manage all role permissions'
    ) THEN
      CREATE POLICY "Admins can manage all role permissions" ON public.role_permissions
      FOR ALL
      USING (has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'admin'));
    END IF;
  END IF;
END $$;