-- ============================================================
-- Триггер автоматического отслеживания конверсии в A/B тестах
-- Выполнить на self-hosted: api.academyos.ru
-- Зависимость: create_persona_ab_tests.sql (должен быть выполнен первым)
-- ============================================================

-- Функция триггера: при смене статуса клиента на конверсионный —
-- автоматически обновляет converted=true в persona_ab_assignments
CREATE OR REPLACE FUNCTION public.track_ab_conversion()
RETURNS TRIGGER AS $$
DECLARE
  v_conversion_statuses TEXT[] := ARRAY[
    'оплатил', 'записался', 'paid', 'enrolled', 'trial_booked',
    'активный', 'active', 'обучается'
  ];
BEGIN
  -- Срабатывает только при изменении статуса
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status = ANY(v_conversion_statuses)
  THEN
    UPDATE public.persona_ab_assignments
    SET converted = true,
        conversion_event = NEW.status
    WHERE client_id = NEW.id
      AND converted = false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Триггер на таблицу clients
DROP TRIGGER IF EXISTS track_ab_conversion_on_client ON public.clients;
CREATE TRIGGER track_ab_conversion_on_client
  AFTER UPDATE OF status ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.track_ab_conversion();

COMMENT ON FUNCTION public.track_ab_conversion() IS 'Автоматически отмечает конверсию в A/B тестах персон при смене статуса клиента на конверсионный.';
