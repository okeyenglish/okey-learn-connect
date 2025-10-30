-- Fix security warning for accrue_teacher_earning_for_lesson
CREATE OR REPLACE FUNCTION accrue_teacher_earning_for_lesson(
  _lesson_session_id UUID DEFAULT NULL,
  _individual_lesson_session_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_teacher_id UUID;
  v_teacher_name TEXT;
  v_lesson_date DATE;
  v_duration INTEGER;
  v_branch TEXT;
  v_subject TEXT;
  v_rate NUMERIC;
  v_amount NUMERIC;
  v_earning_id UUID;
  v_organization_id UUID;
BEGIN
  -- Определяем тип урока и собираем данные
  IF _lesson_session_id IS NOT NULL THEN
    -- Групповое занятие
    SELECT 
      ls.teacher_name,
      ls.lesson_date,
      EXTRACT(EPOCH FROM (ls.end_time - ls.start_time)) / 60 / 45 AS academic_hours,
      ls.branch,
      ls.organization_id,
      p.id
    INTO 
      v_teacher_name,
      v_lesson_date,
      v_duration,
      v_branch,
      v_organization_id,
      v_teacher_id
    FROM lesson_sessions ls
    LEFT JOIN profiles p ON p.name = ls.teacher_name
    WHERE ls.id = _lesson_session_id;
    
  ELSIF _individual_lesson_session_id IS NOT NULL THEN
    -- Индивидуальное занятие
    SELECT 
      ils.teacher_name,
      ils.lesson_date,
      EXTRACT(EPOCH FROM (ils.end_time - ils.start_time)) / 60 / 45 AS academic_hours,
      ils.branch,
      ils.subject,
      ils.organization_id,
      p.id
    INTO 
      v_teacher_name,
      v_lesson_date,
      v_duration,
      v_branch,
      v_subject,
      v_organization_id,
      v_teacher_id
    FROM individual_lesson_sessions ils
    LEFT JOIN profiles p ON p.name = ils.teacher_name
    WHERE ils.id = _individual_lesson_session_id;
  ELSE
    RAISE EXCEPTION 'Необходимо указать ID занятия';
  END IF;
  
  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Преподаватель не найден';
  END IF;
  
  -- Получаем ставку преподавателя
  v_rate := get_teacher_rate(v_teacher_id, v_branch, v_subject, v_lesson_date);
  
  -- Вычисляем сумму
  v_amount := v_rate * v_duration;
  
  -- Создаем запись о начислении
  INSERT INTO teacher_earnings (
    teacher_id,
    lesson_session_id,
    individual_lesson_session_id,
    lesson_date,
    academic_hours,
    rate_per_hour,
    amount,
    status,
    organization_id
  ) VALUES (
    v_teacher_id,
    _lesson_session_id,
    _individual_lesson_session_id,
    v_lesson_date,
    v_duration,
    v_rate,
    v_amount,
    'pending',
    v_organization_id
  )
  RETURNING id INTO v_earning_id;
  
  RETURN v_earning_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create Event Bus System
CREATE TABLE IF NOT EXISTS public.event_bus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  organization_id UUID REFERENCES public.organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  error_message TEXT
);

-- Enable RLS on event_bus
ALTER TABLE public.event_bus ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_bus
CREATE POLICY "Users can view events from their organization"
  ON public.event_bus
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all events"
  ON public.event_bus
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert events"
  ON public.event_bus
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update events"
  ON public.event_bus
  FOR UPDATE
  USING (true);

-- Indexes for event_bus
CREATE INDEX IF NOT EXISTS idx_event_bus_status ON public.event_bus(status);
CREATE INDEX IF NOT EXISTS idx_event_bus_event_type ON public.event_bus(event_type);
CREATE INDEX IF NOT EXISTS idx_event_bus_created_at ON public.event_bus(created_at);
CREATE INDEX IF NOT EXISTS idx_event_bus_organization_id ON public.event_bus(organization_id);
CREATE INDEX IF NOT EXISTS idx_event_bus_aggregate ON public.event_bus(aggregate_type, aggregate_id);

-- Function to publish events
CREATE OR REPLACE FUNCTION public.publish_event(
  p_event_type TEXT,
  p_aggregate_type TEXT,
  p_aggregate_id TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_organization_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.event_bus (
    event_type,
    aggregate_type,
    aggregate_id,
    payload,
    metadata,
    organization_id,
    status
  ) VALUES (
    p_event_type,
    p_aggregate_type,
    p_aggregate_id,
    p_payload,
    p_metadata,
    COALESCE(p_organization_id, (SELECT organization_id FROM public.profiles WHERE id = auth.uid())),
    'pending'
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to process pending events
CREATE OR REPLACE FUNCTION public.process_pending_events(p_limit INTEGER DEFAULT 100)
RETURNS TABLE(
  event_id UUID,
  event_type TEXT,
  aggregate_type TEXT,
  aggregate_id TEXT,
  payload JSONB,
  metadata JSONB,
  organization_id UUID
) AS $$
BEGIN
  -- Update status to processing and return events
  RETURN QUERY
  UPDATE public.event_bus
  SET 
    status = 'processing',
    processed_at = now()
  WHERE id IN (
    SELECT id FROM public.event_bus
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING 
    id,
    event_bus.event_type,
    event_bus.aggregate_type,
    event_bus.aggregate_id,
    event_bus.payload,
    event_bus.metadata,
    event_bus.organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to publish events on lead creation
CREATE OR REPLACE FUNCTION public.trigger_lead_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.publish_event(
    'lead.created',
    'lead',
    NEW.id::TEXT,
    jsonb_build_object(
      'name', NEW.name,
      'phone', NEW.phone,
      'status', NEW.status,
      'source', NEW.source
    ),
    jsonb_build_object('created_by', auth.uid()),
    NEW.organization_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to publish events on lead status update
CREATE OR REPLACE FUNCTION public.trigger_lead_status_updated()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.publish_event(
      'lead.status_updated',
      'lead',
      NEW.id::TEXT,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'name', NEW.name,
        'phone', NEW.phone
      ),
      jsonb_build_object('updated_by', auth.uid()),
      NEW.organization_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers on leads table
DROP TRIGGER IF EXISTS on_lead_created ON public.leads;
CREATE TRIGGER on_lead_created
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_lead_created();

DROP TRIGGER IF EXISTS on_lead_status_updated ON public.leads;
CREATE TRIGGER on_lead_status_updated
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_lead_status_updated();