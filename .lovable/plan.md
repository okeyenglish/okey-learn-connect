
# План: Создание таблицы задач (tasks)

## ✅ Статус: Код обновлён

Код обновлён для работы с `organization_id`. Ожидается выполнение SQL на self-hosted Supabase.

## Выполненные изменения в коде:

### ✅ Шаг 2: useTasks.ts обновлён
- Добавлен импорт `getCurrentOrganizationId` из `@/lib/organizationHelpers`
- Интерфейс `CreateTaskData` расширен полем `organization_id`
- Функция `useCreateTask` теперь автоматически получает `organization_id` перед созданием задачи

## Ожидается от пользователя:

### Шаг 1: Создать таблицу tasks в базе данных
SQL для выполнения на self-hosted Supabase (api.academyos.ru):

```sql
-- 1. Создание таблицы tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  due_date DATE,
  due_time TIME,
  responsible TEXT,
  goal TEXT,
  method TEXT,
  direction TEXT,
  branch TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Включить RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 3. RLS политики для multi-tenant изоляции
CREATE POLICY "Users can view tasks in their organization" ON public.tasks
  FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create tasks in their organization" ON public.tasks
  FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update tasks in their organization" ON public.tasks
  FOR UPDATE USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can delete tasks" ON public.tasks
  FOR DELETE USING (
    organization_id = get_user_organization_id() 
    AND is_admin()
  );

CREATE POLICY "Service role full access to tasks" ON public.tasks
  FOR ALL USING (true);

-- 4. Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON public.tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at);

-- 5. Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_tasks_updated_at();

-- 6. Включить Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
```

## Результат после выполнения SQL
- Задачи будут сохраняться в базе данных
- Задачи будут изолированы по организациям (multi-tenant)
- Realtime обновления будут работать
- UI (список задач, календарь, создание/редактирование) заработает корректно
