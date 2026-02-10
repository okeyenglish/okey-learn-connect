
# Анализ нагрузки на Supabase и план оптимизации

## Топ проблем по данным pg_stat_statements

### 1. Realtime WAL decoding -- 67.8 СЕКУНД суммарного CPU
- **9.4 млн вызовов** `realtime.list_changes()` 
- Это основная нагрузка. Уже начали решать консолидацией каналов в предыдущем шаге
- После деплоя текущих изменений нужно сбросить `pg_stat_statements` и замерить снова

### 2. `assistant_messages` UPDATE is_read -- **2 млн вызовов**, 170 сек CPU
- `markAllAsRead()` вызывается слишком часто: `UPDATE assistant_messages SET is_read = true WHERE is_read = false AND user_id = ...`
- **2 007 501 вызов** -- это ~23 вызова/сек, аномально много
- Причина: скорее всего вызывается при каждом рендере или при каждом открытии CRM без debounce
- **Решение**: добавить debounce и проверку `unreadCount > 0` перед вызовом mutation

### 3. `get_chat_threads_paginated` -- **56 000+ вызовов**, 41 сек CPU, ~1.3 сек/вызов
- Два варианта RPC (`get_chat_threads_paginated` и `get_chat_threads_fast`) суммарно ~56K вызовов
- Среднее время 1.3 сек -- **очень медленно**, нужна оптимизация самой SQL функции
- **Решение**: проверить EXPLAIN плана функции, добавить правильные индексы, кэшировать результат на фронте дольше

### 4. `students SELECT *` -- **3273 вызова**, ~1 сек/вызов, суммарно 3276 сек CPU
- Загружает ALL столбцы ALL студентов каждый раз
- **Решение**: выбирать только нужные колонки, увеличить `staleTime`

### 5. `get_unread_chat_threads` -- **34K вызовов**, суммарно 5.3 сек
- Вызывается параллельно с paginated -- двойная работа
- **Решение**: объединить логику или увеличить staleTime

### 6. `global_chat_read_status SELECT *` -- **10 559 вызовов**
- Уже переведен на polling в предыдущем шаге, должно улучшиться

### 7. `clients` ilike поиск -- **18 139 вызовов**
- Поиск клиентов без индекса по `name` -- каждый запрос сканирует всю таблицу
- **Решение**: добавить GIN/GiST `pg_trgm` индекс для ilike поиска

## План исправлений

### Этап 1: Критические исправления кода (быстрые)

**Файл: `src/hooks/useAssistantMessages.ts`**
- В `markAllAsReadMutation`: добавить проверку `if (unreadCount === 0) return` перед запросом
- Убрать реактивные вызовы, которые триггерят mark-as-read без действия пользователя

**Файл: `src/pages/CRM.tsx`**  
- Проверить, где вызывается `markAssistantAsRead()` -- убедиться что только по клику

**Файл: `src/hooks/useChatThreadsInfinite.ts`**
- Увеличить `staleTime` до 15-30 сек (сейчас скорее всего 5 сек или дефолтный 0)

**Файл: `src/hooks/useStudentsLazy.ts` / useStudents**
- Выбирать только нужные колонки вместо `SELECT *`
- Увеличить `staleTime` до 10-15 мин

### Этап 2: SQL оптимизации (на сервере)

Подготовить SQL скрипт для выполнения на self-hosted:

```text
-- 1. Индекс для ilike поиска клиентов
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_clients_name_trgm 
ON clients USING GIN (name gin_trgm_ops);

-- 2. Индекс для assistant_messages (is_read = false)
CREATE INDEX IF NOT EXISTS idx_assistant_messages_user_unread 
ON assistant_messages (user_id) 
WHERE is_read = false;

-- 3. Оптимизация get_chat_threads_paginated 
-- (нужно посмотреть тело функции и добавить индексы)
```

### Этап 3: Проверка RPC функций

- Посмотреть тело `get_chat_threads_paginated` и `get_chat_threads_fast` на сервере
- Оптимизировать SQL: убрать лишние JOIN, добавить индексы
- Средний вызов 1.3 сек -- это можно улучшить до 50-100ms

## Файлы для изменения

1. `src/hooks/useAssistantMessages.ts` -- debounce markAllAsRead, проверка unreadCount
2. `src/hooks/useChatThreadsInfinite.ts` -- увеличить staleTime
3. `src/hooks/useChatThreadsOptimized.ts` -- увеличить staleTime  
4. `docs/sql-optimizations/optimize_assistant_and_search.sql` -- SQL скрипт для индексов

## Ожидаемый результат

| Запрос | Было (вызовов) | Будет | Снижение |
|--------|---------------|-------|----------|
| assistant_messages UPDATE | 2M | ~10K | -99% |
| get_chat_threads_* | 56K | ~20K | -65% |
| students SELECT * | 3.3K | ~500 | -85% |
| clients ilike | 18K | 18K (но быстрее с индексом) | скорость x10 |
