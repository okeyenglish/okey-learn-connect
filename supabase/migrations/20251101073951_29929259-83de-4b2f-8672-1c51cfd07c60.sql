-- Priority 1 & 2: New tables for chat, assistant, homework templates, and payroll

-- Assistant threads (для контекстно-осознанного ассистента)
CREATE TABLE IF NOT EXISTS assistant_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chat threads (для чатов с группами/студентами/админами)
CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('group', 'student', 'staff')),
  title TEXT,
  participants UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages (универсальная таблица для ассистента и чатов)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL,
  thread_type TEXT NOT NULL CHECK (thread_type IN ('assistant', 'chat')),
  author_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  text TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'error')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Homework templates (шаблоны домашних заданий)
CREATE TABLE IF NOT EXISTS homework_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  level TEXT,
  subject TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payroll monthly (агрегаты зарплаты по месяцам)
CREATE TABLE IF NOT EXISTS payroll_monthly (
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  lessons INT NOT NULL DEFAULT 0,
  hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (teacher_id, month)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assistant_threads_owner ON assistant_threads(owner_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_participants ON chat_threads USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_author ON messages(author_id);
CREATE INDEX IF NOT EXISTS idx_homework_templates_teacher ON homework_templates(teacher_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_payroll_monthly_teacher ON payroll_monthly(teacher_id, month DESC);

-- RLS Policies
ALTER TABLE assistant_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_monthly ENABLE ROW LEVEL SECURITY;

-- Assistant threads: users can manage their own threads
CREATE POLICY "Users can manage their own assistant threads"
  ON assistant_threads FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Chat threads: users can view threads they participate in
CREATE POLICY "Users can view their chat threads"
  ON chat_threads FOR SELECT
  USING (auth.uid() = ANY(participants));

CREATE POLICY "Users can create chat threads"
  ON chat_threads FOR INSERT
  WITH CHECK (auth.uid() = ANY(participants));

-- Messages: users can view messages in their threads
CREATE POLICY "Users can view messages in their threads"
  ON messages FOR SELECT
  USING (
    (thread_type = 'assistant' AND thread_id IN (SELECT id FROM assistant_threads WHERE owner_id = auth.uid()))
    OR
    (thread_type = 'chat' AND thread_id IN (SELECT id FROM chat_threads WHERE auth.uid() = ANY(participants)))
  );

CREATE POLICY "Users can create messages in their threads"
  ON messages FOR INSERT
  WITH CHECK (
    (thread_type = 'assistant' AND thread_id IN (SELECT id FROM assistant_threads WHERE owner_id = auth.uid()))
    OR
    (thread_type = 'chat' AND thread_id IN (SELECT id FROM chat_threads WHERE auth.uid() = ANY(participants)))
  );

-- Homework templates: teachers can manage their own templates
CREATE POLICY "Teachers can manage their own homework templates"
  ON homework_templates FOR ALL
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- Payroll: teachers can view their own payroll
CREATE POLICY "Teachers can view their own payroll"
  ON payroll_monthly FOR SELECT
  USING (auth.uid() = teacher_id);

-- Admins can view all payroll
CREATE POLICY "Admins can view all payroll"
  ON payroll_monthly FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_assistant_threads_updated_at
  BEFORE UPDATE ON assistant_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_threads_updated_at
  BEFORE UPDATE ON chat_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_homework_templates_updated_at
  BEFORE UPDATE ON homework_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_monthly_updated_at
  BEFORE UPDATE ON payroll_monthly
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();