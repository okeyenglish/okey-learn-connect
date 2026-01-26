
# План оптимизации загрузки сообщений в чатах преподавателей

## Статус: В процессе

### Выполнено (Frontend):
- ✅ Timeout для RPC уменьшен до 5 секунд
- ✅ Улучшена fallback-логика: RPC → Direct SELECT
- ✅ staleTime увеличен до 60 секунд для threads-mv
- ✅ Исправлены ошибки сборки (AvatarImage props)
- ✅ Убран retry для teacher messages (есть внутренний fallback)

### Требуется на self-hosted (api.academyos.ru):

#### 1. Создать индексы для chat_messages:
```sql
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_id_created_at 
ON chat_messages (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_unread 
ON chat_messages (client_id, created_at DESC) 
WHERE is_read = false;

ANALYZE chat_messages;
```

#### 2. Создать/обновить RPC get_teacher_chat_messages:
```sql
CREATE OR REPLACE FUNCTION get_teacher_chat_messages(
  p_client_id uuid,
  p_limit int DEFAULT 200
)
RETURNS SETOF chat_messages
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM chat_messages
  WHERE client_id = p_client_id
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_teacher_chat_messages(uuid, int) TO authenticated;
```

#### 3. (Опционально) Создать материализованное представление:
Выполнить скрипт `docs/sql-optimizations/create_teacher_chat_threads_mv.sql`

## Ожидаемые результаты после SQL-оптимизаций:

| Метрика | До | После |
|---------|-----|-------|
| teacher-chat-messages | 10-12 сек | 100-500 мс |
| teacher-chat-threads-mv | 32 сек | 50-100 мс |

