-- ============================================
-- ЭТАП 5: Миграция существующих данных
-- ============================================

-- 5.1. Создать текущую школу как первую организацию
INSERT INTO public.organizations (
  id,
  name,
  slug,
  status,
  plan_type,
  settings,
  branding,
  max_students,
  max_users,
  max_branches
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Основная школа',
  'main-school',
  'active',
  'enterprise',
  '{"timezone": "Europe/Moscow", "currency": "RUB", "language": "ru"}',
  '{"primary_color": "#3b82f6", "logo_url": null}',
  10000,
  100,
  20
);

-- 5.2. Создать филиалы для основной организации
INSERT INTO public.organization_branches (organization_id, name, address, phone, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Котельники', 'Котельники, ул. Кузьминская, 19', '+7 (499) 391-75-47', 1),
  ('00000000-0000-0000-0000-000000000001', 'Новокосино', 'Новокосино, ул. Новокосинская, 35', '+7 (495) 705-99-91', 2),
  ('00000000-0000-0000-0000-000000000001', 'Окская', 'Москва, ул. Окская, 16', '+7 (495) 657-73-71', 3),
  ('00000000-0000-0000-0000-000000000001', 'Измайлово', 'Измайлово, 9-я Парковая улица, 39А', '+7 (499) 166-94-57', 4),
  ('00000000-0000-0000-0000-000000000001', 'Жулебино', 'Жулебино, Авиаконструктора Миля, 8к1', '+7 (495) 704-30-44', 5),
  ('00000000-0000-0000-0000-000000000001', 'Люберцы', 'Люберцы, Комсомольский проспект, 24/2', '+7 (495) 661-46-52', 6),
  ('00000000-0000-0000-0000-000000000001', 'Выхино', 'Выхино, Ташкентская улица, 9', '+7 (495) 657-83-95', 7),
  ('00000000-0000-0000-0000-000000000001', 'Некрасовка', 'Некрасовка, 1-я Вольская улица, 28к1', '+7 (495) 134-22-83', 8);

-- 5.3. Привязать все существующие данные к основной организации
UPDATE public.profiles SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.students SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.clients SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.learning_groups SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.lesson_sessions SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.individual_lessons SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.individual_lesson_sessions SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.payments SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.chat_messages SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.call_logs SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.family_groups SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.courses SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.course_units SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.lessons SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.textbooks SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.classrooms SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.student_segments SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- 5.4. Сделать organization_id обязательным для критичных таблиц (после миграции данных)
ALTER TABLE public.profiles ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.students ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.clients ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.learning_groups ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.lesson_sessions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.individual_lessons ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.payments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.chat_messages ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.call_logs ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.family_groups ALTER COLUMN organization_id SET NOT NULL;

-- 5.5. Обновить функцию handle_new_user для автоматической привязки к организации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_org_id UUID;
BEGIN
  -- Получить ID основной организации (или можно будет брать из приглашения)
  SELECT id INTO default_org_id FROM public.organizations WHERE slug = 'main-school' LIMIT 1;
  
  -- Создать профиль с organization_id
  INSERT INTO public.profiles (id, first_name, last_name, email, organization_id)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'organization_id')::UUID, default_org_id)
  );
  
  -- Назначить роль по умолчанию
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'manager');
  
  RETURN NEW;
END;
$$;