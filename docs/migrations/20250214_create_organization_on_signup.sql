-- ============================================
-- SQL Migration: Функция создания организации при регистрации
-- Применить вручную на api.academyos.ru
-- ============================================

-- Функция вызывается через supabase.rpc('create_organization_on_signup', {...})
-- после успешного signUp. Она:
-- 1. Создаёт новую организацию
-- 2. Привязывает профиль пользователя к организации
-- 3. Назначает роль admin

CREATE OR REPLACE FUNCTION public.create_organization_on_signup(
  org_name TEXT,
  user_first_name TEXT DEFAULT NULL,
  user_last_name TEXT DEFAULT NULL,
  user_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  current_user_id UUID;
  org_slug TEXT;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Проверяем, что у пользователя ещё нет организации
  IF EXISTS (SELECT 1 FROM profiles WHERE id = current_user_id AND organization_id IS NOT NULL) THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  -- Генерируем уникальный slug
  org_slug := lower(regexp_replace(org_name, '[^a-zA-Zа-яА-Я0-9]', '-', 'g')) 
              || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Создаём организацию
  INSERT INTO organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  -- Создаём/обновляем профиль с привязкой к организации
  INSERT INTO profiles (id, organization_id, first_name, last_name, phone)
  VALUES (current_user_id, new_org_id, user_first_name, user_last_name, user_phone)
  ON CONFLICT (id) DO UPDATE SET
    organization_id = new_org_id,
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone);

  -- Назначаем роль admin
  INSERT INTO user_roles (user_id, role)
  VALUES (current_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new_org_id;
END;
$$;

-- Даём доступ аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION public.create_organization_on_signup TO authenticated;
