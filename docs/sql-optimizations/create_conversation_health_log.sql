-- ============================================================
-- Conversation Health Log — таблица для хранения health score
-- Выполнить на self-hosted: api.academyos.ru
-- ============================================================

CREATE TABLE IF NOT EXISTS public.conversation_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('ok', 'warning', 'critical')),
  dominant_signal TEXT, -- e.g. 'short_replies', 'slow_response', 'stage_stagnation', 'manager_spam'
  signals JSONB DEFAULT '{}',
  recommendation TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_health_log_client ON public.conversation_health_log(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_log_org_risk ON public.conversation_health_log(organization_id, risk_level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_log_created ON public.conversation_health_log(created_at DESC);

-- RLS
ALTER TABLE public.conversation_health_log ENABLE ROW LEVEL SECURITY;

-- Политики: чтение для пользователей своей организации
CREATE POLICY "Health log read by org members"
  ON public.conversation_health_log FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Запись только через service role (edge function)
CREATE POLICY "Health log insert by service"
  ON public.conversation_health_log FOR INSERT
  WITH CHECK (true);

-- Автоочистка старых записей (опционально, через pg_cron)
-- SELECT cron.schedule('cleanup-health-log', '0 3 * * *', $$
--   DELETE FROM public.conversation_health_log WHERE created_at < now() - interval '90 days';
-- $$);

COMMENT ON TABLE public.conversation_health_log IS 'Лог health score каждого клиентского диалога. Обновляется после каждого сообщения.';
