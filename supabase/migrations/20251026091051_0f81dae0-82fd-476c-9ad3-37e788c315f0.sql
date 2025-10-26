-- Создание таблицы для SEO страниц
CREATE TABLE IF NOT EXISTS public.seo_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  url TEXT NOT NULL,
  analysis JSONB,
  last_analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, url)
);

-- Enable RLS
ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Users can view pages in their organization"
  ON public.seo_pages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = users.id
      AND users.raw_user_meta_data->>'organization_id' = seo_pages.organization_id::text
    )
  );

CREATE POLICY "Users can insert pages in their organization"
  ON public.seo_pages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = users.id
      AND users.raw_user_meta_data->>'organization_id' = seo_pages.organization_id::text
    )
  );

CREATE POLICY "Users can update pages in their organization"
  ON public.seo_pages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = users.id
      AND users.raw_user_meta_data->>'organization_id' = seo_pages.organization_id::text
    )
  );

-- Триггер для updated_at
CREATE TRIGGER update_seo_pages_updated_at
  BEFORE UPDATE ON public.seo_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Индексы
CREATE INDEX idx_seo_pages_organization_id ON public.seo_pages(organization_id);
CREATE INDEX idx_seo_pages_url ON public.seo_pages(url);
CREATE INDEX idx_seo_pages_last_analyzed ON public.seo_pages(last_analyzed_at DESC);