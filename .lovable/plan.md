
# План: Исправление отображения превью сообщений в списке чатов

## Диагностика

Проблема: все чаты показывают "Нет сообщений" вместо превью последнего сообщения.

**Корневая причина:** Хук `useChatThreadsInfinite` полагается на RPC функции, которые **НЕ СУЩЕСТВУЮТ** в self-hosted базе данных:
- `get_chat_threads_paginated` — не определена
- `get_unread_chat_threads` — не определена
- `get_chat_threads_fast` — не определена

Только `get_chat_threads_by_client_ids` присутствует в типах, но основной код её не использует.

Когда RPC возвращает ошибку `42883` (function does not exist) или `PGRST202`, код отключает RPC и возвращает **пустой массив** (строки 94-97, 107-110). В результате `threads` пуст, и все чаты показывают fallback-текст "Нет сообщений".

## Решение

Добавить **прямой SQL fallback** в `useChatThreadsInfinite`, который работает без RPC. Этот fallback будет автоматически активироваться, когда RPC недоступны.

### Изменения в useChatThreadsInfinite.ts

1. **Добавить функцию `fetchThreadsDirectly`** — аналог из `usePinnedChatThreads.ts`:

```typescript
async function fetchThreadsDirectly(limit: number, offset: number): Promise<ChatThread[]> {
  // 1. Получить клиентов напрямую (без RPC)
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, first_name, last_name, phone, branch, avatar_url, telegram_user_id')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // 2. Получить последние сообщения для этих клиентов
  const clientIds = clients?.map(c => c.id) || [];
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('client_id, message_text, created_at, is_read, messenger_type, message_type')
    .in('client_id', clientIds)
    .order('created_at', { ascending: false })
    .limit(clientIds.length * 5);

  // 3. Сформировать threads с превью
  return buildThreadsFromData(clients, messages);
}
```

2. **Изменить fallback-логику** — вместо возврата пустого массива вызывать `fetchThreadsDirectly`:

```typescript
// БЫЛО (строка 97):
return { threads: [], hasMore: false, pageParam, executionTime: 0 };

// СТАНЕТ:
const directThreads = await fetchThreadsDirectly(PAGE_SIZE, pageParam * PAGE_SIZE);
return { threads: directThreads, hasMore: directThreads.length === PAGE_SIZE, pageParam, executionTime };
```

3. **Аналогично для unreadQuery** — если `get_unread_chat_threads` не существует, использовать прямой запрос с фильтром `is_read = false`.

### Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `src/hooks/useChatThreadsInfinite.ts` | Добавить fallback `fetchThreadsDirectly` |

## Почему это работает

Функция `usePinnedChatThreads` уже имеет рабочий fallback (`fetchThreadsDirectly` на строках 84-184), который успешно получает данные напрямую. Этот же подход нужно применить к основному хуку.

## Влияние

- Превью сообщений будут отображаться корректно
- Последние отправленные сообщения (включая через WPP) будут видны
- Производительность немного снизится (прямые запросы медленнее RPC), но система будет работать
- Опционально: можно добавить миграцию для создания RPC на self-hosted

## Порядок реализации

1. Добавить `fetchThreadsDirectly` в `useChatThreadsInfinite.ts`
2. Заменить `return { threads: [] }` на вызов `fetchThreadsDirectly`
3. Добавить аналогичный fallback для `unreadQuery`
4. Тестирование отображения списка чатов
