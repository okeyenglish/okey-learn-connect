

# Исправление: превью сообщений у непрочитанных чатов

## Проблема

В функции `get_unread_chat_threads` текст последнего сообщения всегда возвращается как `NULL` (строка 226: `NULL::text as last_message_text`). При мёрже в `useChatThreadsInfinite.ts` непрочитанные треды имеют приоритет и перезаписывают данные из paginated-запроса, где текст есть. В результате чаты с непрочитанными показывают "Нет сообщений".

## Решение

Добавить CTE `last_msgs` в `get_unread_chat_threads`, аналогично тому как это сделано в `get_chat_threads_paginated`.

## Технические детали

### 1. Обновить SQL `get_unread_chat_threads` в `docs/rpc-branch-filter-update.sql`

Добавить CTE для получения последнего сообщения:

```text
last_msgs AS (
  SELECT DISTINCT ON (cm.client_id)
    cm.client_id,
    cm.message_text,
    cm.created_at,
    cm.messenger_type
  FROM chat_messages cm
  WHERE cm.client_id IN (SELECT id FROM client_data)
  ORDER BY cm.client_id, cm.created_at DESC
)
```

И заменить `NULL::text as last_message_text` на `lm.message_text as last_message_text`, добавив `LEFT JOIN last_msgs lm ON lm.client_id = cd.id`.

### 2. Создать отдельный SQL-файл для hotfix

Файл: `docs/selfhosted-migrations/20260211_fix_unread_threads_preview.sql`

Содержит обновленную версию `get_unread_chat_threads` с полным текстом последнего сообщения.

### 3. Никаких изменений фронтенда не требуется

Маппер `mapRpcToThreads` уже читает `last_message_text` (строка 486). После исправления SQL, данные будут корректно отображаться.

