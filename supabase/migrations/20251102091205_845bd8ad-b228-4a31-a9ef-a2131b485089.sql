-- Таблица настроек системы
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, setting_key)
);

-- Индексы
CREATE INDEX idx_system_settings_org_key ON public.system_settings(organization_id, setting_key);

-- RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Политики: только админы могут управлять настройками
CREATE POLICY "Admins can view system settings"
  ON public.system_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert system settings"
  ON public.system_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can update system settings"
  ON public.system_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- Триггер для updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Вставляем дефолтную настройку AI провайдера
INSERT INTO public.system_settings (setting_key, setting_value, organization_id)
SELECT 
  'ai_provider',
  '{"provider": "gateway", "description": "Lovable AI Gateway (по умолчанию)"}'::jsonb,
  id
FROM public.organizations
ON CONFLICT (organization_id, setting_key) DO NOTHING;

-- Функция для получения настройки AI провайдера
CREATE OR REPLACE FUNCTION public.get_ai_provider_setting()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
  provider TEXT;
BEGIN
  -- Получаем organization_id текущего пользователя
  SELECT organization_id INTO org_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- Если не найдена организация, используем дефолт
  IF org_id IS NULL THEN
    RETURN 'gateway';
  END IF;
  
  -- Получаем настройку провайдера
  SELECT setting_value->>'provider' INTO provider
  FROM public.system_settings
  WHERE organization_id = org_id
  AND setting_key = 'ai_provider'
  LIMIT 1;
  
  -- Возвращаем провайдера или дефолт
  RETURN COALESCE(provider, 'gateway');
END;
$$;