-- Вторая часть: создаем таблицы и настройки для ролевой системы

-- Создаем таблицу для определения иерархии ролей и прав доступа
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission TEXT NOT NULL,
  resource TEXT NOT NULL,
  can_create BOOLEAN DEFAULT false,
  can_read BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role, permission, resource)
);

-- Включаем RLS для таблицы прав доступа
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Политика: только админы могут управлять правами ролей
CREATE POLICY "Admins can manage role permissions"
ON public.role_permissions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Политика: все аутентифицированные пользователи могут читать права
CREATE POLICY "All authenticated users can view role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (true);

-- Создаем таблицу для дополнительных настроек профиля сотрудника
CREATE TABLE public.employee_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  hire_date DATE,
  salary NUMERIC,
  working_hours JSONB DEFAULT '{"start": "09:00", "end": "18:00", "break_duration": 60}',
  permissions JSONB DEFAULT '{}',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Включаем RLS для настроек сотрудников
ALTER TABLE public.employee_settings ENABLE ROW LEVEL SECURITY;

-- Политики для employee_settings
CREATE POLICY "Users can view their own employee settings"
ON public.employee_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can view all employee settings"
ON public.employee_settings  
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'branch_manager'));

CREATE POLICY "Admins and managers can manage employee settings"
ON public.employee_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'branch_manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'branch_manager'));

-- Триггер для обновления updated_at
CREATE TRIGGER update_employee_settings_updated_at
  BEFORE UPDATE ON public.employee_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();