-- Миграция: Таблица smart_reply_stats для отслеживания популярности Smart Replies
-- Выполнить на self-hosted Supabase (api.academyos.ru)

-- 1. Создать таблицу
CREATE TABLE IF NOT EXISTS public.smart_reply_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reply_text TEXT NOT NULL,
  category TEXT NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id, reply_text)
);

-- 2. Индексы для быстрой выборки
CREATE INDEX IF NOT EXISTS idx_smart_reply_stats_org 
ON public.smart_reply_stats(organization_id);

CREATE INDEX IF NOT EXISTS idx_smart_reply_stats_user_org 
ON public.smart_reply_stats(organization_id, user_id);

CREATE INDEX IF NOT EXISTS idx_smart_reply_stats_popular 
ON public.smart_reply_stats(organization_id, use_count DESC);

-- 3. RLS
ALTER TABLE public.smart_reply_stats ENABLE ROW LEVEL SECURITY;

-- Все сотрудники организации могут видеть статистику (для общего рейтинга)
CREATE POLICY "Users can view org smart reply stats"
ON public.smart_reply_stats
FOR SELECT
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Пользователь может создавать свои записи
CREATE POLICY "Users can insert own smart reply stats"
ON public.smart_reply_stats
FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Пользователь может обновлять только свои записи
CREATE POLICY "Users can update own smart reply stats"
ON public.smart_reply_stats
FOR UPDATE
USING (user_id = auth.uid());

-- 4. RPC для upsert (инкремент счетчика)
CREATE OR REPLACE FUNCTION public.increment_smart_reply_stat(
  p_organization_id UUID,
  p_user_id UUID,
  p_reply_text TEXT,
  p_category TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.smart_reply_stats (organization_id, user_id, reply_text, category, use_count, last_used_at)
  VALUES (p_organization_id, p_user_id, p_reply_text, p_category, 1, now())
  ON CONFLICT (organization_id, user_id, reply_text)
  DO UPDATE SET 
    use_count = smart_reply_stats.use_count + 1,
    last_used_at = now();
END;
$$;

-- 5. Проверка
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'smart_reply_stats' ORDER BY ordinal_position;
