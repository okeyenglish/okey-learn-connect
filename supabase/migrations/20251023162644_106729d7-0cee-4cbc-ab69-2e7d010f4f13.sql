-- Добавляем недостающие колонки в lead_statuses
ALTER TABLE public.lead_statuses 
ADD COLUMN IF NOT EXISTS organization_id UUID,
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Создаем уникальный constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'lead_statuses_external_id_org_unique'
  ) THEN
    ALTER TABLE public.lead_statuses 
    ADD CONSTRAINT lead_statuses_external_id_org_unique 
    UNIQUE (external_id, organization_id);
  END IF;
END$$;

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_lead_statuses_org ON public.lead_statuses(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_statuses_external_id ON public.lead_statuses(external_id);