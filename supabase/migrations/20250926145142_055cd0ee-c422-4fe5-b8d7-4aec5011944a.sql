-- Исправление предупреждений безопасности: правильный порядок удаления и создания
-- Сначала удаляем триггер, затем функцию
DROP TRIGGER IF EXISTS update_user_permissions_updated_at ON public.user_permissions;
DROP FUNCTION IF EXISTS public.update_user_permissions_updated_at() CASCADE;

-- Создаем функцию с правильным search_path
CREATE OR REPLACE FUNCTION public.update_user_permissions_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Создаем триггер заново
CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_user_permissions_updated_at();