
# Оптимизация нагрузки: RPC функции и лишние запросы

## Проблема

За 10 минут RPC функции `get_chat_threads_paginated` и `get_chat_threads_fast` суммарно потребляют **1100 секунд CPU** (91% всей нагрузки). Каждый вызов занимает ~1.5 секунды. Также `hydrateClientBranches` генерирует 314 лишних запросов к таблице `clients`.

## План исправлений

### 1. Увеличить staleTime для unread query

В `useChatThreadsInfinite.ts` запрос `chat-threads-unread-priority` имеет `staleTime: 30000` (30 сек), при этом `chatListQueryConfig` уже 60 сек. Нужно выровнять оба на 60 сек. Также `unread-client-ids` в `useChatThreadsOptimized.ts` имеет `staleTime: 15000` -- увеличить до 60 сек.

### 2. Убрать дублирование: `useChatThreadsOptimized` не используется

CRM.tsx использует только `useChatThreadsInfinite`. Хук `useChatThreadsOptimized` вызывает `get_chat_threads_fast` как fallback и `get_chat_threads_from_mv` / `get_chat_threads_optimized` -- но нигде не используется. Нужно проверить, что он действительно нигде не импортирован, и если так -- можно оставить, он не генерирует нагрузку.

### 3. Кэшировать `hydrateClientBranches`

Сейчас каждый вызов RPC для paginated/unread threads вызывает `hydrateClientBranches`, который делает отдельный SELECT к `clients`. Нужно добавить простой кэш (Map) чтобы не запрашивать уже известные branch-значения повторно.

### 4. Увеличить staleTime для `global_chat_read_status`

307 вызовов за 10 минут -- это ~30/мин, слишком часто для polling. Нужно найти хук, который запрашивает эту таблицу, и увеличить интервал.

### 5. SQL-скрипт для оптимизации RPC (для выполнения на self-hosted)

Подготовить рекомендации по оптимизации тела SQL-функций `get_chat_threads_paginated` и `get_chat_threads_fast` -- они занимают 1.5 сек/вызов и это главная причина нагрузки. Без оптимизации SQL тела всё остальное -- полумеры.

## Файлы для изменения

| Файл | Что делаем |
|------|-----------|
| `src/hooks/useChatThreadsInfinite.ts` | Увеличить `staleTime` unread query до 60 сек |
| `src/hooks/useChatThreadsOptimized.ts` | Увеличить `staleTime` unread-client-ids до 60 сек |
| `src/lib/hydrateClientBranches.ts` | Добавить in-memory кэш branch по client_id (Map с TTL 5 мин), чтобы повторные вызовы не шли в БД |
| `src/hooks/useGlobalReadStatus.ts` (или аналог) | Найти и увеличить интервал polling для `global_chat_read_status` |
| `docs/sql-optimizations/optimize_rpc_functions.sql` | Рекомендации по оптимизации SQL тела RPC: убрать лишние JOIN, использовать `last_message_at` из таблицы `clients` вместо подзапроса к `chat_messages`, добавить LIMIT pushdown |

## Ожидаемый результат

| Метрика | Было (10 мин) | Будет |
|---------|--------------|-------|
| Вызовы RPC paginated+fast | 704 | ~350 (меньше за счет staleTime) |
| hydrate branches запросов | 314 | ~50 (кэш) |
| global_chat_read_status | 307 | ~100 (увеличен интервал) |
| CPU на RPC | 1100 сек | ~550 сек (staleTime) -> нужна SQL оптимизация для x10 |

**Главный вывод**: фронтенд-оптимизации снизят количество вызовов, но ключевое улучшение -- оптимизация SQL тела RPC на self-hosted сервере. Функция, работающая 1.5 сек, должна работать 50-100ms.
