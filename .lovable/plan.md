
# План: Исправление работы задач

## Статус: ✅ Шаг 1 выполнен

## Проблема
Таблица `tasks` существует и содержит данные (видно на скриншоте), но:
1. ~~Тип `Task` в TypeScript не содержит `organization_id`~~ ✅ ИСПРАВЛЕНО
2. Запросы возвращают пустой массив `data: []` - вероятно, RLS политики блокируют доступ

## Выполненные изменения

### ✅ Шаг 1: Обновлён тип Task в database.types.ts

Добавлены поля:
- `organization_id: string` 
- `created_by?: string | null`

## Следующие шаги (выполнить на self-hosted Supabase)

### Шаг 2: Проверить RLS политики на api.academyos.ru

```sql
-- Проверить существующие политики
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'tasks';

-- Если политик нет или они неверные, создать:
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

```sql
-- Проверить включен ли Realtime для tasks
SELECT * FROM pg_publication_tables WHERE tablename = 'tasks';

-- Если нет, включить:
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
```
