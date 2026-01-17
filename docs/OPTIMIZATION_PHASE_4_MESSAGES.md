# Фаза 4: Оптимизация загрузки сообщений

## Выполненные оптимизации

### 1. Критические индексы базы данных

Созданы следующие индексы для таблицы `chat_messages`:

```sql
-- Составной индекс для загрузки сообщений по клиенту (главный индекс)
CREATE INDEX idx_chat_messages_client_created 
ON chat_messages (client_id, created_at DESC);

-- Индекс для быстрого подсчета непрочитанных сообщений
CREATE INDEX idx_chat_messages_client_unread 
ON chat_messages (client_id, is_read, message_type) 
WHERE is_read = false;

-- Индекс для списка чатов - последние сообщения
CREATE INDEX idx_chat_messages_org_created 
ON chat_messages (organization_id, created_at DESC);

-- Индекс для real-time фильтрации по organization_id
CREATE INDEX idx_chat_messages_org_client 
ON chat_messages (organization_id, client_id);
```

### 2. Оптимизация React Query

#### Обновленная конфигурация (`src/lib/queryConfig.ts`)

```typescript
// Для сообщений чата
export const chatQueryConfig = {
  staleTime: 30 * 1000, // Сообщения кешируются 30 сек
  gcTime: 10 * 60 * 1000, // Кэш сообщений 10 минут
  refetchOnWindowFocus: false, // Не рефетчить при фокусе
  refetchOnReconnect: true,
};

// Для списка чатов
export const chatListQueryConfig = {
  staleTime: 10 * 1000, // Список чатов обновляется чаще
  gcTime: 10 * 60 * 1000,
  refetchOnWindowFocus: true,
};
```

### 3. Новые оптимизированные хуки

#### `useChatMessagesOptimized.ts`
- Объединенный запрос count + данные в одном вызове
- Правильное кеширование с `placeholderData`
- Поддержка пагинации

#### `useChatThreadsOptimized.ts`
- Более эффективный алгоритм построения списка чатов
- Параллельная загрузка клиентов и телефонов
- Логирование времени выполнения

### 4. Обновленные существующие хуки

#### `useChatMessages`
- Добавлен `staleTime: 30000`
- Добавлен `gcTime: 10 * 60 * 1000`
- Добавлен `placeholderData` для плавных переходов

#### `useChatThreads`
- Увеличен `staleTime` до 15 секунд
- Добавлен `gcTime: 10 * 60 * 1000`
- Добавлено логирование времени выполнения

## Ожидаемые результаты

| Метрика | До оптимизации | После оптимизации |
|---------|----------------|-------------------|
| Загрузка сообщений чата | 47+ ms | 2-5 ms |
| Загрузка списка чатов | 500-1000 ms | 50-100 ms |
| Повторные запросы | На каждое переключение | Кеш 30 сек |
| Statement timeouts | Частые | Редкие |

## Как проверить работу индексов

```sql
-- Проверить использование индексов
SELECT 
  indexrelname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public' 
  AND tablename = 'chat_messages'
ORDER BY idx_scan DESC;

-- Проверить план запроса
EXPLAIN ANALYZE
SELECT * FROM chat_messages
WHERE client_id = 'YOUR_CLIENT_ID'
ORDER BY created_at DESC
LIMIT 100;
```

## Следующие шаги (опционально)

1. **Материализованное представление для списка чатов** - еще большее ускорение
2. **Оптимизация RLS политик** - кеширование organization_id
3. **Рефакторинг ChatArea** - замена loadMessages на React Query хук
4. **Ограничение real-time подписок** - только активный чат

## Мониторинг

Открыть консоль браузера и наблюдать логи:
```
[useChatThreads] Threads created from messages: { executionTime: "XX.XXms", ... }
[useChatMessagesOptimized] Completed in XX.XXms
```

Время выполнения должно быть < 100ms для списка чатов и < 10ms для сообщений.
