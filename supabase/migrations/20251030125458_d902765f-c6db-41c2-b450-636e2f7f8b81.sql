-- =====================================================
-- COMPENSATING ACTIONS (SAGAS) FOR DATA INTEGRITY
-- =====================================================

-- 1. Компенсация при удалении/отмене платежа
-- Автоматически возвращаем статусы связанных сессий
CREATE OR REPLACE FUNCTION public.compensate_payment_deletion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Если платеж отменяется или удаляется
  IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.status IN ('failed', 'refunded'))) THEN
    
    -- Для индивидуальных занятий: сбрасываем paid_minutes и payment_id
    UPDATE individual_lesson_sessions
    SET 
      paid_minutes = 0,
      payment_id = NULL,
      updated_at = NOW()
    WHERE payment_id = COALESCE(OLD.id, NEW.id);
    
    -- Для групповых занятий: удаляем связь с платежом
    UPDATE lesson_sessions
    SET 
      payment_id = NULL,
      updated_at = NOW()
    WHERE payment_id = COALESCE(OLD.id, NEW.id);
    
    -- Логируем компенсацию
    INSERT INTO audit_log (
      entity_type,
      entity_id,
      event_type,
      old_value,
      new_value,
      user_id
    ) VALUES (
      'payment_compensation',
      COALESCE(OLD.id, NEW.id),
      'sessions_reverted',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', COALESCE(NEW.status, 'deleted')),
      auth.uid()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Триггер на удаление/отмену платежа
DROP TRIGGER IF EXISTS trigger_compensate_payment_deletion ON payments;
CREATE TRIGGER trigger_compensate_payment_deletion
  BEFORE UPDATE OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION compensate_payment_deletion();

-- =====================================================
-- 2. Компенсация при отмене счета (invoice)
-- Автоматически обрабатываем связанные платежи
CREATE OR REPLACE FUNCTION public.compensate_invoice_cancellation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Если счет отменяется
  IF (TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status != 'cancelled') THEN
    
    -- Отменяем все связанные платежи в статусе pending
    UPDATE payments
    SET 
      status = 'failed',
      notes = COALESCE(notes, '') || ' [Auto-cancelled due to invoice cancellation]',
      updated_at = NOW()
    WHERE 
      student_id = NEW.student_id
      AND payment_date::date = NEW.issue_date::date
      AND status = 'pending';
    
    -- Логируем компенсацию
    INSERT INTO audit_log (
      entity_type,
      entity_id,
      event_type,
      old_value,
      new_value,
      user_id
    ) VALUES (
      'invoice_compensation',
      NEW.id,
      'related_payments_cancelled',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Триггер на отмену счета
DROP TRIGGER IF EXISTS trigger_compensate_invoice_cancellation ON invoices;
CREATE TRIGGER trigger_compensate_invoice_cancellation
  AFTER UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION compensate_invoice_cancellation();

-- =====================================================
-- 3. Компенсация при исключении студента из группы
-- Автоматически архивируем будущие занятия
CREATE OR REPLACE FUNCTION public.compensate_student_expulsion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  -- Если студент исключается из группы (expelled)
  IF (TG_OP = 'UPDATE' AND NEW.status = 'expelled' AND OLD.status != 'expelled') THEN
    
    v_group_id := NEW.group_id;
    
    -- Отменяем будущие занятия этого студента в группе
    UPDATE lesson_sessions
    SET 
      status = 'cancelled',
      notes = COALESCE(notes, '') || ' [Auto-cancelled: student expelled]',
      updated_at = NOW()
    WHERE 
      group_id = v_group_id
      AND lesson_date >= CURRENT_DATE
      AND status IN ('scheduled', 'pending')
      AND id IN (
        SELECT ls.id 
        FROM lesson_sessions ls
        WHERE ls.group_id = v_group_id
        AND ls.lesson_date >= CURRENT_DATE
      );
    
    -- Логируем компенсацию
    INSERT INTO audit_log (
      entity_type,
      entity_id,
      event_type,
      old_value,
      new_value,
      user_id
    ) VALUES (
      'enrollment_compensation',
      NEW.id,
      'future_sessions_cancelled',
      jsonb_build_object('status', OLD.status, 'group_id', v_group_id),
      jsonb_build_object('status', NEW.status, 'group_id', v_group_id),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Триггер на исключение студента из группы
DROP TRIGGER IF EXISTS trigger_compensate_student_expulsion ON group_students;
CREATE TRIGGER trigger_compensate_student_expulsion
  AFTER UPDATE ON group_students
  FOR EACH ROW
  EXECUTE FUNCTION compensate_student_expulsion();

-- =====================================================
-- 4. Компенсация при отмене индивидуального занятия
-- Автоматически освобождаем преподавателя и кабинет
CREATE OR REPLACE FUNCTION public.compensate_individual_lesson_cancellation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Если индивидуальное занятие отменяется
  IF (TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status != 'cancelled') THEN
    
    -- Отменяем все будущие сессии
    UPDATE individual_lesson_sessions
    SET 
      status = 'cancelled',
      updated_at = NOW()
    WHERE 
      individual_lesson_id = NEW.id
      AND lesson_date >= CURRENT_DATE
      AND status IN ('scheduled', 'pending');
    
    -- Логируем компенсацию
    INSERT INTO audit_log (
      entity_type,
      entity_id,
      event_type,
      old_value,
      new_value,
      user_id
    ) VALUES (
      'individual_lesson_compensation',
      NEW.id,
      'future_sessions_cancelled',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Триггер на отмену индивидуального занятия
DROP TRIGGER IF EXISTS trigger_compensate_individual_lesson_cancellation ON individual_lessons;
CREATE TRIGGER trigger_compensate_individual_lesson_cancellation
  AFTER UPDATE ON individual_lessons
  FOR EACH ROW
  EXECUTE FUNCTION compensate_individual_lesson_cancellation();

-- =====================================================
-- 5. Компенсация при удалении лида
-- Автоматически удаляем историю статусов
CREATE OR REPLACE FUNCTION public.compensate_lead_deletion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- При удалении лида удаляем его историю
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM lead_status_history WHERE lead_id = OLD.id;
    
    -- Логируем компенсацию
    INSERT INTO audit_log (
      entity_type,
      entity_id,
      event_type,
      old_value,
      new_value,
      user_id
    ) VALUES (
      'lead_compensation',
      OLD.id,
      'history_deleted',
      jsonb_build_object('lead_id', OLD.id, 'status', OLD.status),
      NULL,
      auth.uid()
    );
  END IF;
  
  RETURN OLD;
END;
$$;

-- Триггер на удаление лида
DROP TRIGGER IF EXISTS trigger_compensate_lead_deletion ON leads;
CREATE TRIGGER trigger_compensate_lead_deletion
  BEFORE DELETE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION compensate_lead_deletion();

-- =====================================================
-- 6. Функция для ручной компенсации (rollback)
-- Позволяет откатить изменения вручную
CREATE OR REPLACE FUNCTION public.manual_compensate_payment(
  p_payment_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
  v_sessions_count INT;
BEGIN
  -- Проверяем существование платежа
  IF NOT EXISTS (SELECT 1 FROM payments WHERE id = p_payment_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment not found'
    );
  END IF;
  
  -- Сбрасываем связанные сессии
  WITH updated_sessions AS (
    UPDATE individual_lesson_sessions
    SET 
      paid_minutes = 0,
      payment_id = NULL,
      updated_at = NOW()
    WHERE payment_id = p_payment_id
    RETURNING id
  )
  SELECT COUNT(*) INTO v_sessions_count FROM updated_sessions;
  
  -- Обновляем статус платежа
  UPDATE payments
  SET 
    status = 'failed',
    notes = COALESCE(notes, '') || ' [Manual compensation: ' || COALESCE(p_reason, 'rollback') || ']',
    updated_at = NOW()
  WHERE id = p_payment_id;
  
  -- Логируем
  INSERT INTO audit_log (
    entity_type,
    entity_id,
    event_type,
    old_value,
    new_value,
    user_id
  ) VALUES (
    'manual_compensation',
    p_payment_id,
    'payment_rolled_back',
    jsonb_build_object('reason', p_reason),
    jsonb_build_object('sessions_reverted', v_sessions_count),
    auth.uid()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'sessions_reverted', v_sessions_count,
    'payment_id', p_payment_id
  );
END;
$$;

-- Права на выполнение функции компенсации
GRANT EXECUTE ON FUNCTION manual_compensate_payment TO authenticated;

COMMENT ON FUNCTION manual_compensate_payment IS 'Manually compensate (rollback) a payment and revert related sessions';
