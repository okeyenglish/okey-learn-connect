-- Назначаем роль admin всем пользователям
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::app_role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.id AND ur.role = 'admin'::app_role
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Убеждаемся, что у админов есть полные права на все ресурсы
INSERT INTO public.role_permissions (role, permission, resource, can_create, can_read, can_update, can_delete)
VALUES 
  ('admin', 'manage', 'all', true, true, true, true),
  ('admin', 'view', 'all', false, true, false, false),
  ('admin', 'manage', 'branches', true, true, true, true),
  ('admin', 'manage', 'payments', true, true, true, true),
  ('admin', 'manage', 'finances', true, true, true, true),
  ('admin', 'manage', 'users', true, true, true, true),
  ('admin', 'manage', 'students', true, true, true, true),
  ('admin', 'manage', 'teachers', true, true, true, true),
  ('admin', 'manage', 'groups', true, true, true, true),
  ('admin', 'manage', 'schedule', true, true, true, true),
  ('admin', 'manage', 'reports', true, true, true, true)
ON CONFLICT (role, permission, resource) 
DO UPDATE SET 
  can_create = EXCLUDED.can_create,
  can_read = EXCLUDED.can_read,
  can_update = EXCLUDED.can_update,
  can_delete = EXCLUDED.can_delete;