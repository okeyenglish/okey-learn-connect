
# План оптимизации загрузки сообщений в чатах преподавателей

## Диагностика проблемы

Из скриншота Performance видно:
- **`teacher-chat-threads-mv`**: 32 секунды — материализованное представление либо отсутствует, либо нет индексов
- **`teacher-chat-messages`**: 10-12 секунд (timeout) — RPC функция или индексы не созданы на self-hosted сервере

## Часть 1: SQL-оптимизации на self-hosted backend

Необходимо выполнить на self-hosted сервере (`api.academyos.ru`). Скрипты уже подготовлены в проекте:

### 1.1 Индексы для chat_messages

```sql
-- Выполнить на api.academyos.ru
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_id_created_at 
ON chat_messages (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_unread 
ON chat_messages (client_id, created_at DESC) 
WHERE is_read = false;

ANALYZE chat_messages;
```

### 1.2 Оптимизация RPC get_teacher_chat_messages

Заменить текущую функцию на оптимизированную версию из `docs/sql-optimizations/optimize_teacher_chat_messages.sql`:
- Добавлен параметр `p_limit` для серверного лимитирования
- Облегчённая проверка безопасности `is_teacher_linked_to_client()`
- Использование индексов вместо seq scan

### 1.3 Создание/обновление материализованного представления

Выполнить скрипт `docs/sql-optimizations/create_teacher_chat_threads_mv.sql`:
- Создаёт `teacher_chat_threads_mv` с предрассчитанными данными
- Создаёт индексы на представлении
- Создаёт быстрый RPC `get_teacher_chat_threads_fast`
- Настраивает периодическое обновление (pg_cron каждые 2 минуты)

## Часть 2: Frontend-оптимизации (резервные)

### 2.1 Улучшение fallback-логики в useTeacherChats.ts

Если RPC недоступен или timeout, быстрее переключаться на прямой SELECT:

```text
Файл: src/hooks/useTeacherChats.ts

Изменения:
- Уменьшить TIMEOUT_MS с 12000 до 6000 мс
- При timeout сразу использовать direct select fallback
- Добавить логирование для диагностики
```

### 2.2 Оптимизация кэширования

```text
Файл: src/hooks/useTeacherChats.ts

Изменения:
- Увеличить staleTime для threads-mv до 60 секунд
- Добавить placeholderData для мгновенного отображения из кэша
```

### 2.3 Исправление ошибки сборки

Исправить тип `onLoadingStatusChange` в ChatListItem.tsx — свойство не существует на AvatarImage из Radix UI.

## Ожидаемые результаты

| Метрика | До | После |
|---------|-----|-------|
| teacher-chat-threads-mv | 32 сек | 50-100 мс |
| teacher-chat-messages | 10-12 сек | 100-500 мс |
| Переключение между преподавателями | 10+ сек | < 1 сек |

## Порядок действий

1. **Вы выполняете на self-hosted**: SQL-скрипты из папки `docs/sql-optimizations/`
2. **Я выполняю во фронтенде**: Уменьшение timeout, улучшение fallback, исправление ошибки сборки

---

## Технические детали

### Структура изменений в useTeacherChats.ts

```text
1. Константа TIMEOUT_MS: 12000 → 6000
2. Добавить console.warn при timeout для диагностики
3. staleTime для threads-mv: 15000 → 60000
4. Добавить retry: false для быстрого fallback
```

### Исправление ChatListItem.tsx

Удалить несуществующий проп `onLoadingStatusChange`:

```text
Строки 143-148: Удалить onLoadingStatusChange с AvatarImage
```

### SQL-команда для проверки индексов

```sql
-- Проверка наличия индексов (выполнить на api.academyos.ru)
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'chat_messages';

-- Проверка плана запроса
EXPLAIN ANALYZE 
SELECT * FROM chat_messages 
WHERE client_id = 'test-uuid' 
ORDER BY created_at DESC 
LIMIT 200;
```
