-- Создание таблицы для хранения персональных прав пользователей
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission_key TEXT NOT NULL,
  is_granted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(user_id, permission_key)
);

-- Включаем RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Только администраторы могут управлять правами
CREATE POLICY "Admins can manage all user permissions"
ON public.user_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Пользователи могут просматривать свои права
CREATE POLICY "Users can view own permissions"
ON public.user_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION public.update_user_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_user_permissions_updated_at();

-- Функция для получения прав пользователя
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS TABLE(permission_key TEXT, is_granted BOOLEAN)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT permission_key, is_granted
  FROM public.user_permissions
  WHERE user_id = _user_id;
$$;

-- Функция для проверки конкретного права пользователя
CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id UUID, _permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_granted 
     FROM public.user_permissions 
     WHERE user_id = _user_id AND permission_key = _permission_key),
    false
  );
$$;