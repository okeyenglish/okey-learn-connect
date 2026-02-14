-- ============================================================
-- AI Persona A/B Testing — таблицы для A/B экспериментов персон
-- Выполнить на self-hosted: api.academyos.ru
-- ============================================================

-- 1. Таблица экспериментов
CREATE TABLE IF NOT EXISTS public.persona_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- Personas being compared
  persona_a_id UUID NOT NULL REFERENCES public.ai_personas(id) ON DELETE CASCADE,
  persona_b_id UUID NOT NULL REFERENCES public.ai_personas(id) ON DELETE CASCADE,
  -- Traffic split (0.0-1.0, where value = % going to persona B)
  traffic_split NUMERIC(3,2) NOT NULL DEFAULT 0.50,
  -- Test config
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  -- Target metrics
  target_sample_size INTEGER DEFAULT 100, -- min conversations per variant
  target_metric TEXT DEFAULT 'conversion' CHECK (target_metric IN ('conversion', 'feedback_score', 'response_rate', 'health_score')),
  -- Dates
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Winner
  winner_persona_id UUID REFERENCES public.ai_personas(id),
  winner_confidence NUMERIC(5,2), -- statistical confidence %
  CONSTRAINT different_personas CHECK (persona_a_id != persona_b_id)
);

-- 2. Таблица назначений клиентов в группы теста
CREATE TABLE IF NOT EXISTS public.persona_ab_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.persona_ab_tests(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  assigned_persona_id UUID NOT NULL REFERENCES public.ai_personas(id) ON DELETE CASCADE,
  variant TEXT NOT NULL CHECK (variant IN ('A', 'B')),
  -- Outcome tracking
  converted BOOLEAN DEFAULT false,
  conversion_event TEXT, -- e.g. 'trial_booked', 'paid', 'enrolled'
  messages_count INTEGER DEFAULT 0,
  avg_feedback_score NUMERIC(3,2) DEFAULT 0,
  avg_health_score NUMERIC(5,2) DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(test_id, client_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_ab_tests_org_status ON public.persona_ab_tests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_test ON public.persona_ab_assignments(test_id, variant);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_client ON public.persona_ab_assignments(client_id);

-- Trigger для updated_at
CREATE TRIGGER update_persona_ab_tests_updated_at
  BEFORE UPDATE ON public.persona_ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.persona_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persona_ab_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view ab tests"
  ON public.persona_ab_tests FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage ab tests"
  ON public.persona_ab_tests FOR ALL
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (SELECT has_role(auth.uid(), 'admin')));

CREATE POLICY "Service role full access ab tests"
  ON public.persona_ab_tests FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Org members can view ab assignments"
  ON public.persona_ab_assignments FOR SELECT
  USING (test_id IN (SELECT id FROM persona_ab_tests WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Service role full access ab assignments"
  ON public.persona_ab_assignments FOR ALL USING (true) WITH CHECK (true);

-- Функция для назначения клиента в A/B группу
CREATE OR REPLACE FUNCTION public.assign_client_to_ab_test(
  p_test_id UUID,
  p_client_id UUID
) RETURNS TABLE(assigned_persona_id UUID, variant TEXT) AS $$
DECLARE
  v_test RECORD;
  v_existing RECORD;
  v_random NUMERIC;
  v_variant TEXT;
  v_persona_id UUID;
BEGIN
  -- Check if already assigned
  SELECT * INTO v_existing FROM persona_ab_assignments WHERE test_id = p_test_id AND client_id = p_client_id;
  IF FOUND THEN
    RETURN QUERY SELECT v_existing.assigned_persona_id, v_existing.variant;
    RETURN;
  END IF;

  -- Get test config
  SELECT * INTO v_test FROM persona_ab_tests WHERE id = p_test_id AND status = 'running';
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Random assignment based on traffic_split
  v_random := random();
  IF v_random < v_test.traffic_split THEN
    v_variant := 'B';
    v_persona_id := v_test.persona_b_id;
  ELSE
    v_variant := 'A';
    v_persona_id := v_test.persona_a_id;
  END IF;

  -- Insert assignment
  INSERT INTO persona_ab_assignments (test_id, client_id, assigned_persona_id, variant)
  VALUES (p_test_id, p_client_id, v_persona_id, v_variant);

  RETURN QUERY SELECT v_persona_id, v_variant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Функция для получения сводки A/B теста (с разбивкой по типам конверсии)
CREATE OR REPLACE FUNCTION public.get_ab_test_summary(p_test_id UUID)
RETURNS TABLE(
  variant TEXT,
  total_clients BIGINT,
  converted_clients BIGINT,
  conversion_rate NUMERIC,
  paid_clients BIGINT,
  prolonged_clients BIGINT,
  trial_booked_clients BIGINT,
  total_prolongations BIGINT,
  avg_feedback NUMERIC,
  avg_health NUMERIC,
  avg_messages NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.variant,
    COUNT(*)::BIGINT as total_clients,
    COUNT(*) FILTER (WHERE a.converted)::BIGINT as converted_clients,
    CASE WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE a.converted)::NUMERIC / COUNT(*) * 100, 2) ELSE 0 END as conversion_rate,
    COUNT(*) FILTER (WHERE a.conversion_event = 'paid')::BIGINT as paid_clients,
    COUNT(*) FILTER (WHERE a.conversion_event = 'prolonged')::BIGINT as prolonged_clients,
    COUNT(*) FILTER (WHERE a.conversion_event = 'trial_booked')::BIGINT as trial_booked_clients,
    COALESCE(SUM(a.prolongation_count), 0)::BIGINT as total_prolongations,
    ROUND(AVG(a.avg_feedback_score)::NUMERIC, 2) as avg_feedback,
    ROUND(AVG(a.avg_health_score)::NUMERIC, 2) as avg_health,
    ROUND(AVG(a.messages_count)::NUMERIC, 1) as avg_messages
  FROM persona_ab_assignments a
  WHERE a.test_id = p_test_id
  GROUP BY a.variant
  ORDER BY a.variant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON TABLE public.persona_ab_tests IS 'A/B тесты персон — автоматическое сравнение конверсии между стилями AI.';
COMMENT ON TABLE public.persona_ab_assignments IS 'Назначения клиентов в A/B группы тестов персон.';
