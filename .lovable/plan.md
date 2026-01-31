# План оптимизации загрузки диалогов с клиентами

## Статус: ✅ Полностью реализовано

## Что сделано

### ✅ Шаг 1: SQL-индексы
**Файл:** `docs/sql-optimizations/chat_messages_dialog_indexes.sql`
- `idx_chat_messages_client_created` — для быстрой выборки по client_id
- `idx_chat_messages_client_unread` — для подсчёта непрочитанных
- `idx_chat_messages_external_id` — для дедупликации

### ✅ Шаг 2: RPC функция `get_client_chat_data`
**Файл:** `docs/rpc-get-client-chat-data.sql`
- Объединяет в один запрос: сообщения + unread counts + avatars
- Возвращает JSONB с hasMore флагом

### ✅ Шаг 3: Хук `useClientChatData`
**Файл:** `src/hooks/useClientChatData.ts`
- In-memory кэш 5 минут
- Автоматический fallback на legacy если RPC не установлена
- Prefetch функция для hover
- **Realtime подписка** для INSERT/UPDATE/DELETE событий

### ✅ Шаг 4: Увеличен TTL кэша
**Файл:** `src/hooks/useChatMessagesOptimized.ts`
- CACHE_TTL увеличен с 1 до 5 минут

### ✅ Шаг 5: Интеграция в ChatArea.tsx
**Файл:** `src/components/crm/ChatArea.tsx`
- Заменён `useChatMessagesOptimized` на `useClientChatData`
- Аватары берутся из unified hook (`unifiedAvatars`)
- Счётчики непрочитанных из unified hook (`unifiedUnreadCounts`)
- `fetchExternalAvatar` сохранён для загрузки аватаров с внешних API

## Инструкции для self-hosted

1. Выполнить `docs/sql-optimizations/chat_messages_dialog_indexes.sql`
2. Выполнить `docs/rpc-get-client-chat-data.sql`
3. Проверить работу: `SELECT get_client_chat_data('client-uuid', 100);`

## Ожидаемый результат

| Метрика | До | После |
|---------|-----|-------|
| Количество запросов | 4-6 | 1 (RPC) или 3 (fallback) |
| Время загрузки (первый раз) | 500-1500ms | 100-200ms |
| Время загрузки (повторно) | 200-500ms | ~0ms (кэш) |
| Realtime обновления | Требуют refetch | Автоматически |
