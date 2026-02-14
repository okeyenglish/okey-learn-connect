-- Миграция для таблицы ai_response_feedback
-- Выполнить на self-hosted Supabase (api.academyos.ru)

CREATE TABLE IF NOT EXISTS public.ai_response_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  user_id UUID NOT NULL,
  conversation_example_id UUID,
  client_id UUID REFERENCES public.clients(id),
  pending_response_id UUID,
  response_text TEXT NOT NULL,
  feedback TEXT NOT NULL CHECK (feedback IN ('used', 'rejected', 'edited')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Индексы
CREATE INDEX idx_ai_response_feedback_user ON public.ai_response_feedback(user_id);
CREATE INDEX idx_ai_response_feedback_client ON public.ai_response_feedback(client_id);
CREATE INDEX idx_ai_response_feedback_feedback ON public.ai_response_feedback(feedback);
CREATE INDEX idx_ai_response_feedback_created ON public.ai_response_feedback(created_at DESC);

-- RLS
ALTER TABLE public.ai_response_feedback ENABLE ROW LEVEL SECURITY;

-- Политики
CREATE POLICY "Users can insert own feedback"
  ON public.ai_response_feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view feedback in their org"
  ON public.ai_response_feedback FOR SELECT
  USING (true);

-- Автозаполнение organization_id через триггер
CREATE OR REPLACE FUNCTION public.set_feedback_org_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM public.profiles WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_feedback_org_id_trigger
  BEFORE INSERT ON public.ai_response_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.set_feedback_org_id();
