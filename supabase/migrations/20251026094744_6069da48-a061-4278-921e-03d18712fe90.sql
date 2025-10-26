-- Таблица для хранения данных о поисковых запросах из Google Search Console
CREATE TABLE IF NOT EXISTS public.search_console_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  query TEXT NOT NULL,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC(5,2) DEFAULT 0,
  position NUMERIC(5,2) DEFAULT 0,
  country TEXT,
  device TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_search_console_queries_org ON public.search_console_queries(organization_id);
CREATE INDEX IF NOT EXISTS idx_search_console_queries_page ON public.search_console_queries(page_url);
CREATE INDEX IF NOT EXISTS idx_search_console_queries_date ON public.search_console_queries(date DESC);
CREATE INDEX IF NOT EXISTS idx_search_console_queries_query ON public.search_console_queries(query);

-- Уникальный индекс для предотвращения дубликатов
CREATE UNIQUE INDEX IF NOT EXISTS idx_search_console_queries_unique 
ON public.search_console_queries(organization_id, page_url, query, date, COALESCE(country, ''), COALESCE(device, ''));

-- RLS политики
ALTER TABLE public.search_console_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view queries for their organization"
ON public.search_console_queries
FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Service role can manage all queries"
ON public.search_console_queries
FOR ALL
USING (true)
WITH CHECK (true);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_search_console_queries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_search_console_queries_updated_at
BEFORE UPDATE ON public.search_console_queries
FOR EACH ROW
EXECUTE FUNCTION update_search_console_queries_updated_at();