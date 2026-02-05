
## Исправление ошибки PGRST203: Конфликт перегрузок get_chat_threads_paginated

### Проблема
PostgREST не может выбрать между двумя версиями функции:
- `get_chat_threads_paginated(p_limit, p_offset)` — 2 параметра
- `get_chat_threads_paginated(p_limit, p_offset, p_search)` — 3 параметра

При вызове с 2 параметрами обе функции подходят, что вызывает ошибку PGRST203.

### Решение

#### Часть 1: Frontend — добавить PGRST203 в circuit breaker (временная мера)

**Файл:** `src/hooks/useChatThreadsInfinite.ts`

Добавить код `PGRST203` в список ошибок, при которых отключается RPC:

```text
Строки 94-95 (до):
if (error.code === '42883' || error.code === 'PGRST202' || error.code === '42703') {

Строки 94-95 (после):
if (error.code === '42883' || error.code === 'PGRST202' || error.code === '42703' || error.code === 'PGRST203') {
```

Также добавить в строку 143:
```text
if (error?.code === '42883' || error?.code === 'PGRST202' || error?.code === '42703') return false;

→

if (error?.code === '42883' || error?.code === 'PGRST202' || error?.code === '42703' || error?.code === 'PGRST203') return false;
```

#### Часть 2: SQL скрипт для self-hosted — удалить дубликат функции

**Создать файл:** `docs/fix-chat-threads-paginated-overload.sql`

```sql
-- Исправление ошибки PGRST203: удаление перегруженной версии функции
-- Выполнить на self-hosted Supabase (api.academyos.ru)

-- 1. Удалить ВСЕ версии функции (включая с p_search)
DROP FUNCTION IF EXISTS public.get_chat_threads_paginated(integer, integer);
DROP FUNCTION IF EXISTS public.get_chat_threads_paginated(integer, integer, text);
DROP FUNCTION IF EXISTS public.get_chat_threads_paginated(p_limit integer, p_offset integer);
DROP FUNCTION IF EXISTS public.get_chat_threads_paginated(p_limit integer, p_offset integer, p_search text);

-- 2. Пересоздать только 2-параметровую версию
CREATE FUNCTION get_chat_threads_paginated(...)
-- (полная реализация функции из последней миграции)

-- 3. Выдать права
GRANT EXECUTE ON FUNCTION get_chat_threads_paginated(integer, integer) TO authenticated;

-- 4. Проверить что осталась только одна версия
SELECT proname, pronargs, proargtypes 
FROM pg_proc 
WHERE proname = 'get_chat_threads_paginated';
```

### Деплой

1. **Frontend**: Автоматически деплоится при коммите
2. **SQL**: Запустить вручную на self-hosted:
   ```bash
   docker compose exec db psql -U postgres -d postgres -f /path/to/fix-chat-threads-paginated-overload.sql
   ```
   Или через SQL editor в Supabase Studio.

### Ожидаемый результат

- Ошибка PGRST203 исчезнет
- Чаты будут загружаться корректно
- В базе останется только одна версия функции

### Технические детали

| Изменение | Файл | Описание |
|-----------|------|----------|
| Circuit breaker | `src/hooks/useChatThreadsInfinite.ts` | Добавить PGRST203 в список обрабатываемых ошибок |
| SQL fix | `docs/fix-chat-threads-paginated-overload.sql` | Скрипт удаления дубликата функции |
