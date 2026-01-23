-- =============================================
-- AcademyOS CRM - RLS Policies
-- Row Level Security политики для всех таблиц
-- =============================================

-- =============================================
-- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ RLS
-- =============================================

-- Проверка роли пользователя
CREATE OR REPLACE FUNCTION public.has_role(check_user_id uuid, check_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = check_user_id AND ur.role = check_role
  );
$$;

-- Получение organization_id пользователя
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;

-- Проверка принадлежности к организации
CREATE OR REPLACE FUNCTION public.user_belongs_to_organization(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND organization_id = org_id
  );
$$;

-- =============================================
-- ORGANIZATIONS
-- =============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id = get_user_organization_id());

CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  USING (id = get_user_organization_id() AND has_role(auth.uid(), 'admin'));

-- =============================================
-- PROFILES
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view profiles in their organization"
  ON profiles FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can update any profile in organization"
  ON profiles FOR UPDATE
  USING (organization_id = get_user_organization_id() AND has_role(auth.uid(), 'admin'));

-- =============================================
-- CLIENTS
-- =============================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clients in their organization"
  ON clients FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert clients in their organization"
  ON clients FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update clients in their organization"
  ON clients FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can delete clients"
  ON clients FOR DELETE
  USING (organization_id = get_user_organization_id() AND has_role(auth.uid(), 'admin'));

-- =============================================
-- STUDENTS
-- =============================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view students in their organization"
  ON students FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM clients c 
    WHERE c.id = students.client_id 
    AND c.organization_id = get_user_organization_id()
  ));

CREATE POLICY "Users can insert students"
  ON students FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM clients c 
    WHERE c.id = students.client_id 
    AND c.organization_id = get_user_organization_id()
  ));

CREATE POLICY "Users can update students"
  ON students FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM clients c 
    WHERE c.id = students.client_id 
    AND c.organization_id = get_user_organization_id()
  ));

-- =============================================
-- TEACHERS
-- =============================================

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view teachers in their organization"
  ON teachers FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage teachers"
  ON teachers FOR ALL
  USING (organization_id = get_user_organization_id() AND has_role(auth.uid(), 'admin'));

-- =============================================
-- BRANCHES
-- =============================================

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view branches in their organization"
  ON branches FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage branches"
  ON branches FOR ALL
  USING (organization_id = get_user_organization_id() AND has_role(auth.uid(), 'admin'));

-- =============================================
-- LEARNING_GROUPS
-- =============================================

ALTER TABLE learning_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view groups in their organization"
  ON learning_groups FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM branches b 
    WHERE b.id = learning_groups.branch_id 
    AND b.organization_id = get_user_organization_id()
  ));

CREATE POLICY "Teachers and admins can manage groups"
  ON learning_groups FOR ALL
  USING (EXISTS (
    SELECT 1 FROM branches b 
    WHERE b.id = learning_groups.branch_id 
    AND b.organization_id = get_user_organization_id()
  ) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher')));

-- =============================================
-- CHAT_MESSAGES
-- =============================================

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their organization"
  ON chat_messages FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert messages"
  ON chat_messages FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their own messages"
  ON chat_messages FOR UPDATE
  USING (organization_id = get_user_organization_id() AND sender_id = auth.uid());

-- =============================================
-- MESSAGE_READ_STATUS
-- =============================================

ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view message read status"
  ON message_read_status FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own read status"
  ON message_read_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own read status"
  ON message_read_status FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- GLOBAL_CHAT_READ_STATUS
-- =============================================

ALTER TABLE global_chat_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view global read status"
  ON global_chat_read_status FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage global read status"
  ON global_chat_read_status FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- PINNED_MODALS
-- =============================================

ALTER TABLE pinned_modals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pinned modals"
  ON pinned_modals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pinned modals"
  ON pinned_modals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pinned modals"
  ON pinned_modals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pinned modals"
  ON pinned_modals FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- ASSISTANT_THREADS
-- =============================================

ALTER TABLE assistant_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own assistant threads"
  ON assistant_threads FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- =============================================
-- PAYMENTS
-- =============================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments in their organization"
  ON payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM students s
    JOIN clients c ON s.client_id = c.id
    WHERE s.id = payments.student_id
    AND c.organization_id = get_user_organization_id()
  ));

CREATE POLICY "Admins and managers can manage payments"
  ON payments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM students s
    JOIN clients c ON s.client_id = c.id
    WHERE s.id = payments.student_id
    AND c.organization_id = get_user_organization_id()
  ) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));

-- =============================================
-- LESSON_SESSIONS
-- =============================================

ALTER TABLE lesson_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lesson sessions in their organization"
  ON lesson_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM learning_groups lg
    JOIN branches b ON lg.branch_id = b.id
    WHERE lg.id = lesson_sessions.group_id
    AND b.organization_id = get_user_organization_id()
  ));

CREATE POLICY "Teachers can manage their lesson sessions"
  ON lesson_sessions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM learning_groups lg
    JOIN branches b ON lg.branch_id = b.id
    WHERE lg.id = lesson_sessions.group_id
    AND b.organization_id = get_user_organization_id()
  ) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher')));

-- =============================================
-- СПРАВОЧНИКИ (публичные для чтения)
-- =============================================

-- absence_reasons
ALTER TABLE absence_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view absence reasons"
  ON absence_reasons FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage absence reasons"
  ON absence_reasons FOR ALL USING (has_role(auth.uid(), 'admin'));

-- age_categories
ALTER TABLE age_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view age categories"
  ON age_categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage age categories"
  ON age_categories FOR ALL USING (has_role(auth.uid(), 'admin'));

-- english_levels
ALTER TABLE english_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view english levels"
  ON english_levels FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage english levels"
  ON english_levels FOR ALL USING (has_role(auth.uid(), 'admin'));

-- lesson_types
ALTER TABLE lesson_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view lesson types"
  ON lesson_types FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage lesson types"
  ON lesson_types FOR ALL USING (has_role(auth.uid(), 'admin'));

-- payment_types
ALTER TABLE payment_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view payment types"
  ON payment_types FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage payment types"
  ON payment_types FOR ALL USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- USER_ROLES
-- =============================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view roles in their organization"
  ON user_roles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_roles.user_id
    AND p.organization_id = get_user_organization_id()
  ));

CREATE POLICY "Admins can manage roles"
  ON user_roles FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- AUDIT_LOG
-- =============================================

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit log in their organization"
  ON audit_log FOR SELECT
  USING (organization_id = get_user_organization_id());

-- INSERT разрешён для триггеров (SECURITY DEFINER functions)

-- =============================================
-- PUSH_SUBSCRIPTIONS
-- =============================================

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- ПРОВЕРКА
-- =============================================

SELECT 'RLS policies created successfully!' as status;

-- Список таблиц с RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true
ORDER BY tablename;

-- Количество политик
SELECT count(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public';
