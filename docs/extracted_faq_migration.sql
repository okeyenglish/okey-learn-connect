-- Миграция для таблицы extracted_faq
-- Выполнить на self-hosted Supabase (api.academyos.ru)

CREATE TABLE IF NOT EXISTS public.extracted_faq (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  question_cluster TEXT NOT NULL,
  best_answer TEXT NOT NULL,
  source_example_ids UUID[] DEFAULT '{}',
  frequency INTEGER DEFAULT 1,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Уникальный индекс для предотвращения дубликатов
CREATE UNIQUE INDEX idx_extracted_faq_org_question 
  ON public.extracted_faq(organization_id, question_cluster);

CREATE INDEX idx_extracted_faq_approved ON public.extracted_faq(approved);
CREATE INDEX idx_extracted_faq_frequency ON public.extracted_faq(frequency DESC);

-- RLS
ALTER TABLE public.extracted_faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view FAQ in their org"
  ON public.extracted_faq FOR SELECT USING (true);

CREATE POLICY "Users can insert FAQ"
  ON public.extracted_faq FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update FAQ"
  ON public.extracted_faq FOR UPDATE USING (true);

CREATE POLICY "Users can delete FAQ"
  ON public.extracted_faq FOR DELETE USING (true);

-- Триггер для updated_at
CREATE TRIGGER update_extracted_faq_updated_at
  BEFORE UPDATE ON public.extracted_faq
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
