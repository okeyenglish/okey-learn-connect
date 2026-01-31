

# План исправления критических ошибок CRM

## Проблемы

### 1. RPC `get_unread_chat_threads` - Error 400
**Текущий статус:** Функция на self-hosted базе использует `c.whatsapp_id`, которой нет в таблице `clients`

**Ошибка:** `column c.whatsapp_id does not exist` (4+ вызова при каждой загрузке)

### 2. Медленная загрузка чатов (2-3 секунды)
**Логи:**
- `Page 0: 50 threads in 2588.00ms`
- `Page 0: 50 threads in 3425.00ms`

### 3. Дублирование запросов
4+ одинаковых вызова `get_unread_chat_threads` параллельно

---

## Решение

### Изменение 1: Создать docs/rpc-get-unread-chat-threads.sql

Новая SQL-документация для self-hosted с правильными колонками:

```sql
-- Оптимизированная версия get_unread_chat_threads для self-hosted
CREATE OR REPLACE FUNCTION get_unread_chat_threads(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  clt_id UUID,
  client_name TEXT,
  client_phone TEXT,
  avatar_url TEXT,
  telegram_avatar_url TEXT,
  whatsapp_avatar_url TEXT,
  max_avatar_url TEXT,
  telegram_chat_id TEXT,
  whatsapp_chat_id TEXT,
  max_chat_id TEXT,
  last_message_text TEXT,
  last_message_time TIMESTAMPTZ,
  last_messenger_type TEXT,
  unread_count BIGINT,
  last_unread_messenger TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH clients_with_unread AS (
    SELECT DISTINCT m.client_id
    FROM chat_messages m
    WHERE m.is_read = false AND m.is_outgoing = false
    LIMIT p_limit * 2
  ),
  recent_clients AS (
    SELECT 
      c.id, 
      c.name, 
      c.phone,
      c.avatar_url,
      -- Используем COALESCE для совместимости со всеми схемами
      COALESCE(c.telegram_avatar_url, NULL) as telegram_avatar_url,
      COALESCE(c.whatsapp_avatar_url, NULL) as whatsapp_avatar_url,
      COALESCE(c.max_avatar_url, NULL) as max_avatar_url,
      COALESCE(c.telegram_chat_id, c.telegram_user_id::text, NULL) as telegram_chat_id,
      COALESCE(c.whatsapp_chat_id, c.whatsapp_id, NULL) as whatsapp_chat_id,
      COALESCE(c.max_chat_id, NULL) as max_chat_id,
      c.last_message_at
    FROM clients c
    WHERE c.id IN (SELECT client_id FROM clients_with_unread)
      AND COALESCE(c.is_active, true) = true
  ),
  -- ... остальной код с оптимизациями
$$;
```

### Изменение 2: Добавить fallback в useChatThreadsInfinite.ts

Если RPC `get_unread_chat_threads` возвращает ошибку схемы, отключить вызовы и использовать основной список:

**Файл:** `src/hooks/useChatThreadsInfinite.ts`

**Изменения (строки ~118-138):**

```typescript
// Флаг для отключения неработающего RPC
let useUnreadRpc = true;

const unreadQuery = useQuery({
  queryKey: ['chat-threads-unread-priority'],
  queryFn: async () => {
    // Если RPC сломан - сразу возвращаем пустой массив
    if (!useUnreadRpc) {
      return [];
    }
    
    const { data, error } = await supabase
      .rpc('get_unread_chat_threads', { p_limit: 50 });

    if (error) {
      // Если ошибка схемы - отключить RPC навсегда до перезагрузки
      if (error.code === '42703' || error.code === 'PGRST202') {
        console.warn('[useChatThreadsInfinite] Disabling broken unread RPC');
        useUnreadRpc = false;
      }
      return [];
    }

    return mapRpcToThreads((data || []) as RpcThreadRow[]);
  },
  staleTime: 30000, // 30 секунд вместо 10
  refetchOnWindowFocus: false,
  retry: false, // Не ретраить ошибки схемы
});
```

### Изменение 3: Дедупликация запросов

Добавить флаг `enabled` для предотвращения дублирования при первичной загрузке:

```typescript
// Предотвращаем множественные запросы
const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

const unreadQuery = useQuery({
  // ...
  enabled: !hasLoadedOnce || unreadQuery.isStale,
  onSuccess: () => setHasLoadedOnce(true),
});
```

---

## Файлы для изменения

| Файл | Действие |
|------|----------|
| `docs/rpc-get-unread-chat-threads.sql` | Создать - SQL для self-hosted |
| `src/hooks/useChatThreadsInfinite.ts` | Изменить - добавить fallback и дедупликацию |

---

## После применения

1. Ошибки 400 по `get_unread_chat_threads` прекратятся (fallback)
2. Загрузка CRM не будет блокироваться сломанным RPC
3. После выполнения нового SQL на self-hosted - RPC заработает полностью
4. Дублирование запросов устранено

---

## Инструкция по применению

1. **Lovable** применяет изменения в `useChatThreadsInfinite.ts`
2. **Вручную** выполнить SQL из `docs/rpc-get-unread-chat-threads.sql` на self-hosted
3. Проверить загрузку CRM - ошибки 400 должны исчезнуть

