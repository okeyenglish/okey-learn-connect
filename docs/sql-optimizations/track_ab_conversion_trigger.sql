-- ============================================================
-- Триггер автоматического отслеживания конверсии в A/B тестах
-- Выполнить на self-hosted: api.academyos.ru
-- Зависимость: create_persona_ab_tests.sql (должен быть выполнен первым)
--
-- Схема clients НЕ содержит колонку status.
-- Конверсионные события определяются по:
--   1. portal_enabled: false → true  (клиент записался)
--   2. has_pending_payment: true → false (оплата подтверждена)
-- ============================================================

CREATE OR REPLACE FUNCTION public.track_ab_conversion()
RETURNS TRIGGER AS $$
DECLARE
  v_event TEXT := NULL;
BEGIN
  -- Событие 1: клиент записался (портал активирован)
  IF OLD.portal_enabled IS DISTINCT FROM NEW.portal_enabled
     AND NEW.portal_enabled = true
  THEN
    v_event := 'enrolled';
  END IF;

  -- Событие 2: оплата подтверждена
  IF OLD.has_pending_payment IS DISTINCT FROM NEW.has_pending_payment
     AND OLD.has_pending_payment = true
     AND NEW.has_pending_payment = false
  THEN
    v_event := 'paid';
  END IF;

  -- Обновляем A/B назначение если произошла конверсия
  IF v_event IS NOT NULL THEN
    UPDATE public.persona_ab_assignments
    SET converted = true,
        conversion_event = v_event
    WHERE client_id = NEW.id
      AND converted = false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Триггер на таблицу clients
DROP TRIGGER IF EXISTS track_ab_conversion_on_client ON public.clients;
CREATE TRIGGER track_ab_conversion_on_client
  AFTER UPDATE OF portal_enabled, has_pending_payment ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.track_ab_conversion();

COMMENT ON FUNCTION public.track_ab_conversion() IS 'Автоматически отмечает конверсию в A/B тестах персон при записи (portal_enabled) или оплате (has_pending_payment) клиента.';
