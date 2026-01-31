
# План оптимизации загрузки диалогов с клиентами

## Проблема
При переключении на чат с клиентом происходит **4-6 отдельных запросов к базе данных**, что вызывает задержку ~500-1500ms:

1. `useChatMessagesOptimized` → запрос сообщений из `chat_messages`
2. `useClientAvatars` → запрос аватаров из `clients`
3. `useClientUnreadByMessenger` → подсчёт непрочитанных
4. `useCallHistory` → история звонков (self-hosted API)
5. Realtime подписки

## Решение: Объединённая RPC функция + индексы

### Шаг 1: SQL-индексы для self-hosted (если не установлены)

```text
docs/sql-optimizations/chat_messages_dialog_indexes.sql
```

Создать/проверить индексы:
- `idx_chat_messages_client_created` — для быстрой выборки сообщений по client_id
- `idx_chat_messages_client_unread` — для подсчёта непрочитанных

### Шаг 2: Новая RPC функция `get_client_chat_data`

```text
docs/rpc-get-client-chat-data.sql
```

Объединит в **один запрос**:
- Последние 100 сообщений
- Флаг `has_more` (есть ли ещё сообщения)
- Счётчики непрочитанных по мессенджерам (whatsapp, telegram, max)
- Аватары клиента (whatsapp_avatar_url, telegram_avatar_url, max_avatar_url)

### Шаг 3: Новый хук `useClientChatData`

```text
src/hooks/useClientChatData.ts
```

- Один вызов вместо 3-4 отдельных
- In-memory кэш с TTL 5 минут (вместо 1 минуты)
- `placeholderData` для мгновенного отображения из кэша
- Fallback на старые хуки если RPC не найдена

### Шаг 4: Обновление ChatArea

```text
src/components/crm/ChatArea.tsx
```

- Заменить `useChatMessagesOptimized` + `useClientAvatars` + `useClientUnreadByMessenger` на единый `useClientChatData`
- Убрать дублирующиеся запросы

## Ожидаемый результат

| Метрика | До | После |
|---------|-----|-------|
| Количество запросов | 4-6 | 1-2 |
| Время загрузки (первый раз) | 500-1500ms | 100-200ms |
| Время загрузки (повторно) | 200-500ms | ~0ms (кэш) |

## Файлы для изменения

1. **Создать**: `docs/rpc-get-client-chat-data.sql` — SQL для self-hosted
2. **Создать**: `docs/sql-optimizations/chat_messages_dialog_indexes.sql` — индексы
3. **Создать**: `src/hooks/useClientChatData.ts` — объединённый хук
4. **Изменить**: `src/components/crm/ChatArea.tsx` — использовать новый хук
5. **Изменить**: `src/hooks/useChatMessagesOptimized.ts` — увеличить TTL кэша до 5 минут

## Технические детали

### RPC функция (псевдокод)
```sql
CREATE FUNCTION get_client_chat_data(p_client_id uuid, p_limit int DEFAULT 100)
RETURNS jsonb AS $$
  -- 1. Сообщения с LIMIT + 1 для hasMore
  -- 2. COUNT непрочитанных по messenger_type
  -- 3. Аватары из clients
  -- Возврат в одном jsonb объекте
$$
```

### Хук useClientChatData
```typescript
// In-memory кэш на 5 минут
const clientChatCache = new Map<string, { data: ClientChatData; timestamp: number }>();

export const useClientChatData = (clientId: string) => {
  // 1. Проверить кэш → мгновенное отображение
  // 2. Вызвать RPC get_client_chat_data
  // 3. Fallback на старые хуки если RPC не существует
  // 4. Обновить кэш
};
```
