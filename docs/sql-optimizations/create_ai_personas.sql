-- ============================================================
-- AI Persona Layer — таблицы для персон и тегирования
-- Выполнить на self-hosted: api.academyos.ru
-- ============================================================

-- 1. Таблица персон организации
CREATE TABLE IF NOT EXISTS public.ai_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL, -- e.g. 'academic_guide', 'sales_consultant', 'support_helper'
  name TEXT NOT NULL, -- e.g. 'Академический консультант'
  description TEXT,
  tone TEXT, -- e.g. 'спокойный, объясняющий'
  selling_level TEXT CHECK (selling_level IN ('none', 'soft', 'moderate', 'aggressive')) DEFAULT 'soft',
  formality TEXT CHECK (formality IN ('informal', 'neutral', 'formal')) DEFAULT 'neutral',
  max_response_length INTEGER DEFAULT 150,
  system_prompt_override TEXT, -- optional full system prompt override
  style_instructions TEXT, -- additional style instructions appended to prompt
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  -- Auto-assignment rules
  auto_assign_stages TEXT[] DEFAULT '{}', -- e.g. {'objection', 'offer'}
  auto_assign_scenario_types TEXT[] DEFAULT '{}', -- e.g. {'complaint', 'upsell'}
  -- Stats
  usage_count INTEGER DEFAULT 0,
  avg_feedback_score NUMERIC(3,2) DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, slug)
);

-- 2. Привязка персоны к менеджеру (опционально)
CREATE TABLE IF NOT EXISTS public.manager_persona_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES public.ai_personas(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(manager_id, organization_id)
);

-- 3. Добавить persona_tag к conversation_examples (если таблица существует)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_examples' AND table_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversation_examples' AND column_name = 'persona_tag') THEN
      ALTER TABLE public.conversation_examples ADD COLUMN persona_tag TEXT;
      CREATE INDEX IF NOT EXISTS idx_conv_examples_persona ON public.conversation_examples(persona_tag);
    END IF;
  END IF;
END $$;

-- 4. Добавить persona_tag к conversation_segments (если таблица существует)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_segments' AND table_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversation_segments' AND column_name = 'persona_tag') THEN
      ALTER TABLE public.conversation_segments ADD COLUMN persona_tag TEXT;
    END IF;
  END IF;
END $$;

-- Индексы
CREATE INDEX IF NOT EXISTS idx_ai_personas_org ON public.ai_personas(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_manager_persona_org ON public.manager_persona_assignments(organization_id);

-- RLS
ALTER TABLE public.ai_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_persona_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view personas"
  ON public.ai_personas FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage personas"
  ON public.ai_personas FOR ALL
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) 
    AND (SELECT has_role(auth.uid(), 'admin')));

CREATE POLICY "Service role full access personas"
  ON public.ai_personas FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Org members can view persona assignments"
  ON public.manager_persona_assignments FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage persona assignments"
  ON public.manager_persona_assignments FOR ALL
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (SELECT has_role(auth.uid(), 'admin')));

CREATE POLICY "Service role full access persona assignments"
  ON public.manager_persona_assignments FOR ALL USING (true) WITH CHECK (true);

-- Seed default personas
INSERT INTO public.ai_personas (organization_id, slug, name, description, tone, selling_level, formality, max_response_length, style_instructions, auto_assign_stages, auto_assign_scenario_types, is_default)
SELECT 
  o.id,
  p.slug,
  p.name,
  p.description,
  p.tone,
  p.selling_level,
  p.formality,
  p.max_length,
  p.style,
  p.stages,
  p.scenarios,
  p.is_default
FROM organizations o
CROSS JOIN (VALUES
  ('academic_guide', 'Академический консультант', 'Спокойный, объясняющий стиль. Фокус на ценности обучения.', 'спокойный, объясняющий, терпеливый', 'soft', 'neutral', 150,
   'Объясняй пользу обучения. Не дави на продажу. Используй аналогии и примеры. Задавай уточняющие вопросы о целях.',
   ARRAY['greeting', 'qualification', 'need_discovery']::TEXT[],
   ARRAY['info_request', 'new_lead']::TEXT[],
   true),
  ('sales_consultant', 'Продающий консультант', 'Ведёт к записи. Мягко закрывает. Задаёт вопросы.', 'уверенный, дружелюбный, целеустремлённый', 'moderate', 'neutral', 120,
   'Веди к записи на пробный урок. Задавай закрывающие вопросы. Подчёркивай уникальность предложения. Создавай ощущение срочности.',
   ARRAY['value_explanation', 'objection', 'offer', 'closing']::TEXT[],
   ARRAY['returning', 'upsell', 'reactivation']::TEXT[],
   false),
  ('support_helper', 'Помощник поддержки', 'Быстрый, конкретный, без продаж.', 'дружелюбный, конкретный, эффективный', 'none', 'neutral', 100,
   'Отвечай быстро и конкретно. Не продавай. Реши проблему клиента. Если вопрос не по теме — перенаправь.',
   ARRAY['follow_up']::TEXT[],
   ARRAY['complaint', 'scheduling', 'payment']::TEXT[],
   false)
) AS p(slug, name, description, tone, selling_level, formality, max_length, style, stages, scenarios, is_default)
ON CONFLICT (organization_id, slug) DO NOTHING;

COMMENT ON TABLE public.ai_personas IS 'AI Persona Layer — определяет стиль общения AI в зависимости от контекста.';
