-- Создание таблицы источников лидов
CREATE TABLE public.lead_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Создание таблицы статусов лидов
CREATE TABLE public.lead_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6b7280',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_success BOOLEAN NOT NULL DEFAULT false,
  is_failure BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Создание таблицы лидов
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  middle_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  age INTEGER,
  subject TEXT,
  level TEXT,
  branch TEXT NOT NULL DEFAULT 'Окская',
  preferred_time TEXT,
  preferred_days TEXT[],
  notes TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  lead_source_id UUID REFERENCES public.lead_sources(id),
  status_id UUID REFERENCES public.lead_statuses(id),
  assigned_to UUID,
  converted_to_student_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Создание таблицы истории статусов лидов
CREATE TABLE public.lead_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_status_id UUID REFERENCES public.lead_statuses(id),
  to_status_id UUID REFERENCES public.lead_statuses(id),
  changed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Триггеры для updated_at
CREATE TRIGGER update_lead_sources_updated_at
  BEFORE UPDATE ON public.lead_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_statuses_updated_at
  BEFORE UPDATE ON public.lead_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Начальные данные для источников лидов
INSERT INTO public.lead_sources (name, description) VALUES
  ('Сайт', 'Заявки с официального сайта'),
  ('Google Ads', 'Реклама в Google'),
  ('Яндекс.Директ', 'Реклама в Яндексе'),
  ('Социальные сети', 'Заявки из соцсетей'),
  ('Рекомендации', 'Рекомендации клиентов'),
  ('Холодные звонки', 'Исходящие звонки'),
  ('Другое', 'Прочие источники');

-- Начальные данные для статусов лидов
INSERT INTO public.lead_statuses (name, description, color, sort_order, is_success, is_failure) VALUES
  ('Новый', 'Новая заявка', '#3b82f6', 1, false, false),
  ('В работе', 'Лид обрабатывается', '#f59e0b', 2, false, false),
  ('Записан на пробный', 'Записан на пробный урок', '#8b5cf6', 3, false, false),
  ('Отложен', 'Временно приостановлен', '#6b7280', 4, false, false),
  ('Успешен', 'Конвертирован в ученика', '#10b981', 5, true, false),
  ('Неуспешен', 'Отказался или не подходит', '#ef4444', 6, false, true);

-- Включение RLS
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;

-- Политики для источников лидов
CREATE POLICY "Authenticated users can view lead sources" ON public.lead_sources
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage lead sources" ON public.lead_sources
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'sales_manager'::app_role) OR 
    has_role(auth.uid(), 'marketing_manager'::app_role)
  );

-- Политики для статусов лидов
CREATE POLICY "Authenticated users can view lead statuses" ON public.lead_statuses
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage lead statuses" ON public.lead_statuses
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'sales_manager'::app_role)
  );

-- Политики для лидов
CREATE POLICY "Users can view leads from their branches" ON public.leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (leads.branch = p.branch OR EXISTS (
        SELECT 1 FROM public.manager_branches mb
        WHERE mb.manager_id = auth.uid() AND mb.branch = leads.branch
      ))
    )
  );

CREATE POLICY "Users can insert leads to their branches" ON public.leads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (leads.branch = p.branch OR EXISTS (
        SELECT 1 FROM public.manager_branches mb
        WHERE mb.manager_id = auth.uid() AND mb.branch = leads.branch
      ))
    )
  );

CREATE POLICY "Users can update leads from their branches" ON public.leads
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (leads.branch = p.branch OR EXISTS (
        SELECT 1 FROM public.manager_branches mb
        WHERE mb.manager_id = auth.uid() AND mb.branch = leads.branch
      ))
    )
  );

CREATE POLICY "Users can delete leads from their branches" ON public.leads
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (leads.branch = p.branch OR EXISTS (
        SELECT 1 FROM public.manager_branches mb
        WHERE mb.manager_id = auth.uid() AND mb.branch = leads.branch
      ))
    )
  );

-- Политики для истории статусов
CREATE POLICY "Users can view lead status history for their branch leads" ON public.lead_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads l, public.profiles p
      WHERE l.id = lead_status_history.lead_id
      AND p.id = auth.uid()
      AND (l.branch = p.branch OR EXISTS (
        SELECT 1 FROM public.manager_branches mb
        WHERE mb.manager_id = auth.uid() AND mb.branch = l.branch
      ))
    )
  );

CREATE POLICY "Users can insert lead status history for their branch leads" ON public.lead_status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l, public.profiles p
      WHERE l.id = lead_status_history.lead_id
      AND p.id = auth.uid()
      AND (l.branch = p.branch OR EXISTS (
        SELECT 1 FROM public.manager_branches mb
        WHERE mb.manager_id = auth.uid() AND mb.branch = l.branch
      ))
    )
  );

-- Функция для автоматического добавления записи в историю статусов
CREATE OR REPLACE FUNCTION public.track_lead_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Добавляем запись в историю только если статус изменился
  IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
    INSERT INTO public.lead_status_history (
      lead_id,
      from_status_id,
      to_status_id,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status_id,
      NEW.status_id,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Триггер для отслеживания изменений статуса
CREATE TRIGGER track_lead_status_change_trigger
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.track_lead_status_change();