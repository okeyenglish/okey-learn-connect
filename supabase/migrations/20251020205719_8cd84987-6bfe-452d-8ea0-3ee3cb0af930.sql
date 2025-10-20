-- Таблица для уведомлений
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL,
  recipient_type TEXT NOT NULL DEFAULT 'student',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  delivery_method TEXT[] DEFAULT ARRAY['in_app'],
  metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON public.notifications(scheduled_at);

-- Таблица для массовых рассылок
CREATE TABLE IF NOT EXISTS public.broadcast_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  delivery_method TEXT[] NOT NULL DEFAULT ARRAY['in_app'],
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы для рассылок
CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_status ON public.broadcast_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_scheduled ON public.broadcast_campaigns(scheduled_at);

-- RLS политики для уведомлений
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Admins and managers can manage all notifications"
  ON public.notifications
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR
    has_role(auth.uid(), 'branch_manager')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR
    has_role(auth.uid(), 'branch_manager')
  );

CREATE POLICY "Users can mark their notifications as read"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- RLS политики для рассылок
ALTER TABLE public.broadcast_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view campaigns"
  ON public.broadcast_campaigns
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR
    has_role(auth.uid(), 'branch_manager')
  );

CREATE POLICY "Admins and managers can manage campaigns"
  ON public.broadcast_campaigns
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager')
  );

-- Триггеры для обновления updated_at
CREATE OR REPLACE FUNCTION public.update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notifications_updated_at();

CREATE TRIGGER trigger_update_broadcast_campaigns_updated_at
  BEFORE UPDATE ON public.broadcast_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notifications_updated_at();

-- Функция для получения целевой аудитории рассылки
CREATE OR REPLACE FUNCTION public.get_campaign_recipients(
  p_target_audience TEXT,
  p_filters JSONB
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_phone TEXT
) AS $$
BEGIN
  IF p_target_audience = 'all_students' THEN
    RETURN QUERY
    SELECT 
      p.id,
      CONCAT(p.first_name, ' ', p.last_name) as user_name,
      p.email,
      p.phone
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'student';
    
  ELSIF p_target_audience = 'active_students' THEN
    RETURN QUERY
    SELECT DISTINCT
      p.id,
      CONCAT(p.first_name, ' ', p.last_name) as user_name,
      p.email,
      p.phone
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'student'
      AND (
        EXISTS (
          SELECT 1 FROM group_students gs 
          WHERE gs.student_id = p.id AND gs.status = 'active'
        )
        OR EXISTS (
          SELECT 1 FROM individual_lessons il 
          WHERE il.student_id = p.id AND il.is_active = true
        )
      );
      
  ELSIF p_target_audience = 'low_balance' THEN
    RETURN QUERY
    SELECT 
      p.id,
      CONCAT(p.first_name, ' ', p.last_name) as user_name,
      p.email,
      p.phone
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'student'
      AND p.balance < 1000;
      
  ELSIF p_target_audience = 'by_branch' THEN
    RETURN QUERY
    SELECT 
      p.id,
      CONCAT(p.first_name, ' ', p.last_name) as user_name,
      p.email,
      p.phone
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'student'
      AND p.branch = (p_filters->>'branch');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;