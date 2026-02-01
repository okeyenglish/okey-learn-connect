
# План: Исправление работы задач

## Проблема
Таблица `tasks` существует и содержит данные (видно на скриншоте), но:
1. Тип `Task` в TypeScript не содержит `organization_id` - код может работать некорректно
2. Запросы возвращают пустой массив `data: []` - вероятно, RLS политики блокируют доступ

## Решение

### Шаг 1: Обновить тип Task в database.types.ts

Добавить поле `organization_id` в интерфейс Task:

```typescript
export interface Task {
  id: string;
  organization_id: string;  // <-- добавить
  client_id?: string | null;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  due_date?: string | null;
  due_time?: string | null;
  responsible?: string | null;
  goal?: string | null;
  method?: string | null;
  direction?: string | null;
  branch?: string | null;
  created_by?: string | null; // <-- добавить если нет
  created_at: string;
  updated_at: string;
  clients?: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
}
```

### Шаг 2: Проверить RLS политики на self-hosted Supabase

Выполнить на `api.academyos.ru`:

```text
-- Проверить существующие политики
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'tasks';

-- Если политик нет, создать их:
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks in their organization" 
ON public.tasks FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create tasks in their organization" 
ON public.tasks FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update tasks in their organization" 
ON public.tasks FOR UPDATE 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Service role full access to tasks" 
ON public.tasks FOR ALL 
USING (true);
```

### Шаг 3: Проверить Realtime

```text
-- Проверить включен ли Realtime для tasks
SELECT * FROM pg_publication_tables WHERE tablename = 'tasks';

-- Если нет, включить:
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
```

## Изменяемые файлы

| Файл | Изменение |
|------|-----------|
| `src/integrations/supabase/database.types.ts` | Добавить `organization_id` и `created_by` в интерфейс Task |

## Результат

После исправления:
- TypeScript типы будут соответствовать реальной схеме БД
- RLS будет правильно фильтровать данные по organization_id
- Задачи будут отображаться в UI корректно
