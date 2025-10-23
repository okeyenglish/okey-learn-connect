-- Создание таблицы client_statuses для статусов клиентов
CREATE TABLE IF NOT EXISTS public.client_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6b7280',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_success BOOLEAN NOT NULL DEFAULT false,
  is_failure BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  organization_id UUID,
  external_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT client_statuses_external_id_org_unique UNIQUE (external_id, organization_id)
);

-- Создание таблицы student_statuses для статусов учеников
CREATE TABLE IF NOT EXISTS public.student_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6b7280',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_success BOOLEAN NOT NULL DEFAULT false,
  is_failure BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  organization_id UUID,
  external_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT student_statuses_external_id_org_unique UNIQUE (external_id, organization_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_client_statuses_org ON public.client_statuses(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_statuses_active ON public.client_statuses(is_active);
CREATE INDEX IF NOT EXISTS idx_student_statuses_org ON public.student_statuses(organization_id);
CREATE INDEX IF NOT EXISTS idx_student_statuses_active ON public.student_statuses(is_active);

-- Триггеры для обновления updated_at
CREATE OR REPLACE FUNCTION update_client_statuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_student_statuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_statuses_updated_at
BEFORE UPDATE ON public.client_statuses
FOR EACH ROW
EXECUTE FUNCTION update_client_statuses_updated_at();

CREATE TRIGGER update_student_statuses_updated_at
BEFORE UPDATE ON public.student_statuses
FOR EACH ROW
EXECUTE FUNCTION update_student_statuses_updated_at();

-- RLS политики
ALTER TABLE public.client_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_statuses ENABLE ROW LEVEL SECURITY;

-- Администраторы и методисты могут управлять статусами
CREATE POLICY "Admins and methodists can manage client statuses"
ON public.client_statuses
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role));

CREATE POLICY "Admins and methodists can manage student statuses"
ON public.student_statuses
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role));

-- Авторизованные пользователи могут просматривать статусы
CREATE POLICY "Authenticated users can view client statuses"
ON public.client_statuses
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view student statuses"
ON public.student_statuses
FOR SELECT
USING (auth.uid() IS NOT NULL);