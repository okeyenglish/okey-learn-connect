-- Функция для очистки payment_id и paid_minutes при удалении платежа
CREATE OR REPLACE FUNCTION public.cleanup_payment_links_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Очищаем payment_id и paid_minutes у всех сессий, привязанных к удаляемому платежу
  UPDATE public.individual_lesson_sessions
  SET 
    payment_id = NULL,
    paid_minutes = 0,
    updated_at = now()
  WHERE payment_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Триггер на удаление платежа
DROP TRIGGER IF EXISTS cleanup_payment_links_trigger ON public.payments;
CREATE TRIGGER cleanup_payment_links_trigger
  BEFORE DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_payment_links_on_delete();