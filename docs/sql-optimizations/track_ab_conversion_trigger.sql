-- ============================================================
-- Триггеры автоматического отслеживания конверсии в A/B тестах
-- Выполнить на self-hosted: api.academyos.ru
-- Зависимость: create_persona_ab_tests.sql (должен быть выполнен первым)
--
-- Конверсионные события:
--   1. has_pending_payment: false → true  (клиент оплатил через эквайринг)
--      - Сначала проверяется "свежесть" клиента:
--        clients.created_at >= persona_ab_tests.started_at?
--      - НЕТ (старый/склеенный клиент) → conversion_event = 'prolonged'
--      - ДА (новый клиент):
--        - Если нет платежей за год → conversion_event = 'paid' (первичная)
--        - Если есть платежи за год → conversion_event = 'prolonged' (пролонгация)
--   2. INSERT в trial_lesson_requests     (клиент записался на пробное)
--
-- Миграция: добавить колонку prolongation_count
-- ============================================================

-- ==========================================
-- 0. Миграция: prolongation_count
-- ==========================================
ALTER TABLE public.persona_ab_assignments
  ADD COLUMN IF NOT EXISTS prolongation_count INTEGER DEFAULT 0;

-- ==========================================
-- 1. Триггер оплаты (clients)
-- ==========================================
CREATE OR REPLACE FUNCTION public.track_ab_conversion()
RETURNS TRIGGER AS $$
DECLARE
  v_prev_payments INTEGER;
  v_test_started_at TIMESTAMPTZ;
BEGIN
  -- Событие: клиент оплатил через интернет-эквайринг
  IF OLD.has_pending_payment IS DISTINCT FROM NEW.has_pending_payment
     AND NEW.has_pending_payment = true
  THEN
    -- Получаем дату запуска теста для проверки "свежести" клиента
    SELECT t.started_at INTO v_test_started_at
    FROM public.persona_ab_assignments a
    JOIN public.persona_ab_tests t ON t.id = a.test_id
    WHERE a.client_id = NEW.id
      AND t.status = 'running'
    LIMIT 1;

    -- Если клиент не в тесте — выходим
    IF v_test_started_at IS NULL THEN
      RETURN NEW;
    END IF;

    -- Старый или склеенный клиент (created_at < started_at теста)
    IF NEW.created_at < v_test_started_at THEN
      UPDATE public.persona_ab_assignments
      SET conversion_event = 'prolonged',
          converted = true,
          prolongation_count = prolongation_count + 1
      WHERE client_id = NEW.id;
    ELSE
      -- Новый клиент — проверяем наличие подтверждённых платежей за последний год
      SELECT count(*) INTO v_prev_payments
      FROM public.online_payments
      WHERE client_id = NEW.id
        AND status = 'CONFIRMED'
        AND created_at > now() - interval '1 year';

      IF v_prev_payments = 0 THEN
        -- Первичная продажа
        UPDATE public.persona_ab_assignments
        SET converted = true,
            conversion_event = 'paid'
        WHERE client_id = NEW.id
          AND converted = false;
      ELSE
        -- Пролонгация
        UPDATE public.persona_ab_assignments
        SET conversion_event = 'prolonged',
            converted = true,
            prolongation_count = prolongation_count + 1
        WHERE client_id = NEW.id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS track_ab_conversion_on_client ON public.clients;
CREATE TRIGGER track_ab_conversion_on_client
  AFTER UPDATE OF has_pending_payment ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.track_ab_conversion();

COMMENT ON FUNCTION public.track_ab_conversion() IS
  'Отмечает конверсию в A/B тестах при оплате. Сначала проверяет свежесть клиента (created_at >= test.started_at): старые/склеенные → prolonged, новые → paid (нет платежей за год) или prolonged (есть платежи).';

-- ==========================================
-- 2. Триггер записи на пробное (trial_lesson_requests)
-- ==========================================
CREATE OR REPLACE FUNCTION public.track_ab_trial_conversion()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id UUID;
  v_phone TEXT;
BEGIN
  -- Нормализация телефона: убрать всё кроме цифр
  v_phone := regexp_replace(NEW.phone, '[^0-9]', '', 'g');

  -- Российская нормализация: 10 цифр начиная с 9 → добавить 7; 11 цифр начиная с 8 → заменить на 7
  IF length(v_phone) = 10 AND v_phone LIKE '9%' THEN
    v_phone := '7' || v_phone;
  ELSIF length(v_phone) = 11 AND v_phone LIKE '8%' THEN
    v_phone := '7' || substring(v_phone FROM 2);
  END IF;

  -- Найти клиента по нормализованному телефону
  SELECT id INTO v_client_id
  FROM public.clients
  WHERE regexp_replace(phone, '[^0-9]', '', 'g') = v_phone
     OR regexp_replace(phone, '[^0-9]', '', 'g') = substring(v_phone FROM 2)
  LIMIT 1;

  IF v_client_id IS NOT NULL THEN
    UPDATE public.persona_ab_assignments
    SET converted = true,
        conversion_event = 'trial_booked'
    WHERE client_id = v_client_id
      AND converted = false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS track_ab_trial_conversion_on_request ON public.trial_lesson_requests;
CREATE TRIGGER track_ab_trial_conversion_on_request
  AFTER INSERT ON public.trial_lesson_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.track_ab_trial_conversion();

COMMENT ON FUNCTION public.track_ab_trial_conversion() IS
  'Отмечает конверсию trial_booked в A/B тестах при записи на пробное занятие (по совпадению телефона с clients).';
