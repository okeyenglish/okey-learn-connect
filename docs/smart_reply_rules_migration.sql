-- Миграция: Таблица smart_reply_rules для хранения пользовательских правил Smart Replies
-- Выполнить на self-hosted Supabase (api.academyos.ru)

-- 1. Создать таблицу
CREATE TABLE IF NOT EXISTS public.smart_reply_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  triggers TEXT[] NOT NULL DEFAULT '{}',
  replies TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, category)
);

-- 2. Индексы
CREATE INDEX IF NOT EXISTS idx_smart_reply_rules_org
ON public.smart_reply_rules(organization_id);

CREATE INDEX IF NOT EXISTS idx_smart_reply_rules_active
ON public.smart_reply_rules(organization_id, is_active);

-- 3. RLS
ALTER TABLE public.smart_reply_rules ENABLE ROW LEVEL SECURITY;

-- Все сотрудники организации могут видеть правила
CREATE POLICY "Users can view org smart reply rules"
ON public.smart_reply_rules
FOR SELECT
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Только админы могут создавать
CREATE POLICY "Admins can insert smart reply rules"
ON public.smart_reply_rules
FOR INSERT
WITH CHECK (
  organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  AND public.is_admin()
);

-- Только админы могут обновлять
CREATE POLICY "Admins can update smart reply rules"
ON public.smart_reply_rules
FOR UPDATE
USING (
  organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  AND public.is_admin()
);

-- Только админы могут удалять
CREATE POLICY "Admins can delete smart reply rules"
ON public.smart_reply_rules
FOR DELETE
USING (
  organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  AND public.is_admin()
);

-- 4. Триггер обновления updated_at
CREATE TRIGGER update_smart_reply_rules_updated_at
BEFORE UPDATE ON public.smart_reply_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Проверка
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'smart_reply_rules' ORDER BY ordinal_position;
