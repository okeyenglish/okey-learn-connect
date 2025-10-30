-- ============================================
-- ПРИОРИТЕТ 2: STATE MACHINES + AUDIT LOG + IDEMPOTENCY
-- ============================================

-- 1. AUDIT LOG - единый лог всех критических изменений
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  
  -- Событие
  event_type TEXT NOT NULL, -- 'lesson.status_changed', 'payment.confirmed', etc
  aggregate_type TEXT NOT NULL, -- 'lesson_session', 'payment', 'enrollment'
  aggregate_id UUID NOT NULL,
  
  -- Изменения
  old_value JSONB,
  new_value JSONB,
  
  -- Метаданные
  changed_by UUID REFERENCES auth.users(id),
  request_id TEXT, -- для связи с логами
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_org ON public.audit_log(organization_id);
CREATE INDEX idx_audit_log_aggregate ON public.audit_log(aggregate_type, aggregate_id);
CREATE INDEX idx_audit_log_event_type ON public.audit_log(event_type);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view audit log in their org"
ON public.audit_log FOR SELECT
USING (organization_id = get_user_organization_id());

-- 2. IDEMPOTENCY для платежей
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
ADD COLUMN IF NOT EXISTS provider_transaction_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency 
ON public.payments(organization_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_provider_tx 
ON public.payments(provider_transaction_id) 
WHERE provider_transaction_id IS NOT NULL;

-- 3. STATE MACHINE для lesson_sessions
-- Добавляем валидацию переходов через constraint
CREATE OR REPLACE FUNCTION validate_lesson_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  valid_transitions JSONB := '{
    "scheduled": ["in_progress", "cancelled"],
    "in_progress": ["completed", "cancelled"],
    "completed": [],
    "cancelled": []
  }'::jsonb;
BEGIN
  -- Пропускаем валидацию при INSERT
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Проверяем легальность перехода
  IF OLD.status != NEW.status THEN
    IF NOT (valid_transitions->OLD.status ? NEW.status) THEN
      RAISE EXCEPTION 'Недопустимый переход статуса: % -> %', OLD.status, NEW.status;
    END IF;
    
    -- Логируем в audit_log
    INSERT INTO public.audit_log (
      organization_id, event_type, aggregate_type, aggregate_id,
      old_value, new_value, changed_by
    ) VALUES (
      NEW.organization_id,
      'lesson.status_changed',
      'lesson_session',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_lesson_status_transition_trigger ON public.lesson_sessions;
CREATE TRIGGER validate_lesson_status_transition_trigger
BEFORE UPDATE ON public.lesson_sessions
FOR EACH ROW
EXECUTE FUNCTION validate_lesson_status_transition();

-- 4. Функция для логирования в audit_log
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_event_type TEXT,
  p_aggregate_type TEXT,
  p_aggregate_id UUID,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  INSERT INTO public.audit_log (
    organization_id, event_type, aggregate_type, aggregate_id,
    old_value, new_value, changed_by, request_id
  ) VALUES (
    v_org_id, p_event_type, p_aggregate_type, p_aggregate_id,
    p_old_value, p_new_value, auth.uid(), p_request_id
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- 5. STATE MACHINE для payments
CREATE OR REPLACE FUNCTION validate_payment_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  valid_transitions JSONB := '{
    "pending": ["confirmed", "failed"],
    "confirmed": ["refunded", "partially_refunded"],
    "partially_refunded": ["refunded"],
    "refunded": [],
    "failed": []
  }'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  IF OLD.status != NEW.status THEN
    IF NOT (valid_transitions->OLD.status ? NEW.status) THEN
      RAISE EXCEPTION 'Недопустимый переход статуса платежа: % -> %', OLD.status, NEW.status;
    END IF;
    
    -- Логируем
    INSERT INTO public.audit_log (
      organization_id, event_type, aggregate_type, aggregate_id,
      old_value, new_value, changed_by
    ) VALUES (
      NEW.organization_id,
      'payment.status_changed',
      'payment',
      NEW.id,
      jsonb_build_object('status', OLD.status, 'amount', OLD.amount),
      jsonb_build_object('status', NEW.status, 'amount', NEW.amount),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_payment_status_transition_trigger ON public.payments;
CREATE TRIGGER validate_payment_status_transition_trigger
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION validate_payment_status_transition();

-- Комментарии
COMMENT ON TABLE public.audit_log IS 'Единый аудит-лог всех критических изменений в системе';
COMMENT ON FUNCTION validate_lesson_status_transition IS 'FSM: Валидация переходов статусов занятий';
COMMENT ON FUNCTION validate_payment_status_transition IS 'FSM: Валидация переходов статусов платежей';

DO $$
BEGIN
  RAISE NOTICE '✅ PRIORITY 2 FOUNDATION APPLIED:';
  RAISE NOTICE '   - Audit log created';
  RAISE NOTICE '   - Idempotency keys for payments';
  RAISE NOTICE '   - FSM validation for lessons & payments';
  RAISE NOTICE '   - Next: Add FSM for enrollments, leads, invoices';
END $$;