-- =============================================
-- Real-Time Conversation Intelligence
-- Database Schema for Self-Hosted Supabase
-- =============================================

-- 1. Conversation stages reference table (customizable per org)
CREATE TABLE IF NOT EXISTS public.conversation_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  code TEXT NOT NULL,           -- e.g. 'greeting', 'qualification'
  name TEXT NOT NULL,           -- display name e.g. 'Приветствие'
  description TEXT,             -- what this stage means
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, code)
);

-- Default stages (insert for each organization)
-- Run after creating for your org:
/*
INSERT INTO public.conversation_stages (organization_id, code, name, description, sort_order) VALUES
  ('YOUR_ORG_ID', 'greeting', 'Приветствие', 'Первый контакт, представление', 1),
  ('YOUR_ORG_ID', 'qualification', 'Квалификация', 'Определение целевой аудитории и потребностей', 2),
  ('YOUR_ORG_ID', 'need_discovery', 'Выявление потребности', 'Глубокое понимание целей клиента', 3),
  ('YOUR_ORG_ID', 'value_explanation', 'Объяснение ценности', 'Презентация продукта/услуги', 4),
  ('YOUR_ORG_ID', 'objection', 'Работа с возражениями', 'Обработка сомнений и вопросов', 5),
  ('YOUR_ORG_ID', 'offer', 'Предложение', 'Конкретное коммерческое предложение', 6),
  ('YOUR_ORG_ID', 'closing', 'Закрытие', 'Завершение сделки, оплата', 7),
  ('YOUR_ORG_ID', 'follow_up', 'Фоллоуап', 'Повторный контакт после паузы', 8);
*/

-- 2. Current conversation state (updated after each message)
CREATE TABLE IF NOT EXISTS public.conversation_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  current_stage TEXT NOT NULL,     -- stage code
  previous_stage TEXT,             -- for transition tracking
  confidence REAL NOT NULL DEFAULT 0,  -- 0-1 classifier confidence
  stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_classified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  message_window_size INT DEFAULT 8,  -- how many messages were analyzed
  metadata JSONB DEFAULT '{}',     -- extra context from classifier
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_states_org ON public.conversation_states(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversation_states_stage ON public.conversation_states(current_stage);

-- 3. Next best actions per stage
CREATE TABLE IF NOT EXISTS public.next_best_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  stage_code TEXT NOT NULL,        -- which stage triggers this
  action_type TEXT NOT NULL,       -- e.g. 'ask_question', 'social_proof', 'offer_trial'
  action_label TEXT NOT NULL,      -- display text: 'Задайте уточняющий вопрос о цели обучения'
  action_detail TEXT,              -- longer explanation or template
  priority INT NOT NULL DEFAULT 0, -- higher = more important
  success_rate REAL DEFAULT 0,     -- calculated from mining
  usage_count INT DEFAULT 0,       -- how many times used
  is_active BOOLEAN NOT NULL DEFAULT true,
  source TEXT DEFAULT 'manual',    -- 'manual' | 'mined'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nba_org_stage ON public.next_best_actions(organization_id, stage_code);

-- Default NBAs
/*
INSERT INTO public.next_best_actions (organization_id, stage_code, action_type, action_label, action_detail, priority) VALUES
  ('YOUR_ORG_ID', 'greeting', 'ask_question', 'Представьтесь и спросите имя', 'Привет! Меня зовут [имя]. Как к вам обращаться?', 10),
  ('YOUR_ORG_ID', 'qualification', 'ask_question', 'Уточните возраст ученика', 'Сколько лет вашему ребёнку / вам?', 10),
  ('YOUR_ORG_ID', 'qualification', 'ask_question', 'Спросите про цель обучения', 'Какая цель обучения? Школа, экзамены, путешествия?', 9),
  ('YOUR_ORG_ID', 'need_discovery', 'ask_question', 'Выясните текущий уровень', 'Занимались ли раньше? Какой примерный уровень?', 10),
  ('YOUR_ORG_ID', 'need_discovery', 'ask_question', 'Узнайте удобный формат', 'Какой формат удобнее — онлайн или офлайн?', 8),
  ('YOUR_ORG_ID', 'value_explanation', 'social_proof', 'Поделитесь отзывом', 'У нас занимается 500+ учеников, вот что говорят родители...', 9),
  ('YOUR_ORG_ID', 'objection', 'handle_objection', 'Не называйте цену сразу', 'Сначала уточните потребность, потом предложите подходящий вариант', 10),
  ('YOUR_ORG_ID', 'objection', 'offer_trial', 'Предложите пробное занятие', 'Приходите на бесплатное пробное — увидите всё сами!', 9),
  ('YOUR_ORG_ID', 'offer', 'create_urgency', 'Создайте срочность', 'Места в группу ограничены, осталось X мест', 8),
  ('YOUR_ORG_ID', 'closing', 'confirm_action', 'Подтвердите следующий шаг', 'Записываю вас на [дата/время]! Подтверждаете?', 10),
  ('YOUR_ORG_ID', 'follow_up', 're_engage', 'Напомните о себе', 'Добрый день! Вы интересовались занятиями — актуально ещё?', 10);
*/

-- 4. Action outcomes for mining pipeline
CREATE TABLE IF NOT EXISTS public.conversation_action_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  stage_code TEXT NOT NULL,
  action_taken TEXT NOT NULL,      -- what the manager actually did
  next_stage TEXT,                 -- what stage followed
  led_to_conversion BOOLEAN DEFAULT false, -- did this path lead to success?
  response_time_seconds INT,       -- how fast manager responded
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_outcomes_mining ON public.conversation_action_outcomes(organization_id, stage_code, led_to_conversion);

-- 5. Stage transition log (for analytics)
CREATE TABLE IF NOT EXISTS public.conversation_stage_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  confidence REAL,
  manager_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stage_transitions_org ON public.conversation_stage_transitions(organization_id, created_at DESC);

-- RLS policies
ALTER TABLE public.conversation_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.next_best_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_action_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_stage_transitions ENABLE ROW LEVEL SECURITY;

-- Service role full access (for edge functions)
CREATE POLICY "Service role full access" ON public.conversation_stages FOR ALL USING (true);
CREATE POLICY "Service role full access" ON public.conversation_states FOR ALL USING (true);
CREATE POLICY "Service role full access" ON public.next_best_actions FOR ALL USING (true);
CREATE POLICY "Service role full access" ON public.conversation_action_outcomes FOR ALL USING (true);
CREATE POLICY "Service role full access" ON public.conversation_stage_transitions FOR ALL USING (true);

-- Users can view their org data
CREATE POLICY "Users can view org stages" ON public.conversation_stages FOR SELECT 
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can view org states" ON public.conversation_states FOR SELECT 
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can view org nba" ON public.next_best_actions FOR SELECT 
  USING (organization_id = public.get_user_organization_id());

-- Admins can manage stages and NBAs
CREATE POLICY "Admins can manage stages" ON public.conversation_stages FOR ALL 
  USING (organization_id = public.get_user_organization_id() AND public.is_admin());

CREATE POLICY "Admins can manage nba" ON public.next_best_actions FOR ALL 
  USING (organization_id = public.get_user_organization_id() AND public.is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_conversation_states_updated_at
  BEFORE UPDATE ON public.conversation_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_next_best_actions_updated_at
  BEFORE UPDATE ON public.next_best_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Verification
-- =============================================
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'conversation%';
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'next_best_actions';
