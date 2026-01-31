
# План исправления аватарок в списке чатов

## Диагноз проблемы

Аватарка работает внутри чата (ChatArea), но не в списке чатов слева, потому что:

1. **ChatArea** использует `useClientAvatars` - запрашивает `whatsapp_avatar_url, telegram_avatar_url, max_avatar_url`
2. **Но на self-hosted** эти колонки НЕ существуют - есть только `avatar_url`
3. **RPC функции** (`get_chat_threads_paginated`, `get_unread_chat_threads`) могут не возвращать `avatar_url` вообще

На скриншоте видно, что у некоторых клиентов (Роза, Анастасия Шалимова) аватарки есть - значит `avatar_url` заполнен в БД и частично приходит.

## Исправления

### 1. Обновить `useClientAvatars.ts`
Добавить fallback на `avatar_url`:
```typescript
const { data: client } = await supabase
  .from('clients')
  .select('avatar_url, whatsapp_avatar_url, telegram_avatar_url, max_avatar_url')
  .eq('id', clientId)
  .maybeSingle();

const newCache: AvatarCacheEntry = {
  whatsapp: client?.whatsapp_avatar_url || client?.avatar_url || null,
  telegram: client?.telegram_avatar_url || client?.avatar_url || null,
  max: client?.max_avatar_url || client?.avatar_url || null,
  fetchedAt: Date.now(),
};
```

### 2. Обновить RPC функции на self-hosted
SQL для `get_chat_threads_paginated` и `get_unread_chat_threads` должен включать `c.avatar_url`:
```sql
SELECT 
  ...,
  c.avatar_url,
  ...
FROM clients c
```

### 3. Обновить `usePinnedChatThreads.ts`
Запрашивать только существующие колонки:
```typescript
.select(`id, name, first_name, last_name, phone, branch, avatar_url, telegram_user_id`)
```

## Технические детали

### Файлы для изменения:
1. `src/hooks/useClientAvatars.ts` - добавить fallback на `avatar_url`
2. `src/hooks/usePinnedChatThreads.ts` - убрать запросы к несуществующим колонкам

### SQL миграция (выполнить на self-hosted):
```sql
-- Обновить get_unread_chat_threads
CREATE OR REPLACE FUNCTION get_unread_chat_threads(p_limit INT DEFAULT 50)
RETURNS TABLE (
  clt_id UUID,
  client_name TEXT,
  first_name TEXT,
  last_name TEXT,
  client_phone TEXT,
  client_branch TEXT,
  avatar_url TEXT,
  telegram_chat_id TEXT,
  last_message_text TEXT,
  last_message_time TIMESTAMPTZ,
  unread_count BIGINT,
  unread_whatsapp BIGINT,
  unread_telegram BIGINT,
  unread_max BIGINT,
  unread_email BIGINT,
  unread_calls BIGINT,
  last_unread_messenger TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH unread_counts AS (
    SELECT 
      cm.client_id,
      COUNT(*) as total_unread,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'whatsapp') as unread_wa,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'telegram') as unread_tg,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'max') as unread_mx,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'email') as unread_em,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'calls') as unread_cl,
      MAX(cm.created_at) as last_unread_at,
      (ARRAY_AGG(cm.messenger_type ORDER BY cm.created_at DESC))[1] as last_messenger
    FROM chat_messages cm
    WHERE cm.is_read = false 
      AND cm.message_type = 'client'
      AND cm.client_id IS NOT NULL
    GROUP BY cm.client_id
  ),
  last_messages AS (
    SELECT DISTINCT ON (client_id)
      client_id,
      message_text,
      created_at
    FROM chat_messages
    WHERE client_id IS NOT NULL
    ORDER BY client_id, created_at DESC
  )
  SELECT 
    c.id as clt_id,
    c.name as client_name,
    c.first_name,
    c.last_name,
    c.phone as client_phone,
    c.branch as client_branch,
    c.avatar_url,
    c.telegram_user_id::TEXT as telegram_chat_id,
    lm.message_text as last_message_text,
    lm.created_at as last_message_time,
    COALESCE(uc.total_unread, 0) as unread_count,
    COALESCE(uc.unread_wa, 0) as unread_whatsapp,
    COALESCE(uc.unread_tg, 0) as unread_telegram,
    COALESCE(uc.unread_mx, 0) as unread_max,
    COALESCE(uc.unread_em, 0) as unread_email,
    COALESCE(uc.unread_cl, 0) as unread_calls,
    uc.last_messenger as last_unread_messenger
  FROM clients c
  INNER JOIN unread_counts uc ON c.id = uc.client_id
  LEFT JOIN last_messages lm ON c.id = lm.client_id
  WHERE c.is_active = true
  ORDER BY uc.last_unread_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Обновить get_chat_threads_paginated  
CREATE OR REPLACE FUNCTION get_chat_threads_paginated(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  clt_id UUID,
  client_name TEXT,
  first_name TEXT,
  last_name TEXT,
  client_phone TEXT,
  client_branch TEXT,
  avatar_url TEXT,
  telegram_chat_id TEXT,
  last_message_text TEXT,
  last_message_time TIMESTAMPTZ,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH last_messages AS (
    SELECT DISTINCT ON (client_id)
      client_id,
      message_text,
      created_at
    FROM chat_messages
    WHERE client_id IS NOT NULL
    ORDER BY client_id, created_at DESC
  ),
  unread_counts AS (
    SELECT 
      client_id,
      COUNT(*) as cnt
    FROM chat_messages
    WHERE is_read = false 
      AND message_type = 'client'
      AND client_id IS NOT NULL
    GROUP BY client_id
  )
  SELECT 
    c.id as clt_id,
    c.name as client_name,
    c.first_name,
    c.last_name,
    c.phone as client_phone,
    c.branch as client_branch,
    c.avatar_url,
    c.telegram_user_id::TEXT as telegram_chat_id,
    lm.message_text as last_message_text,
    lm.created_at as last_message_time,
    COALESCE(uc.cnt, 0) as unread_count
  FROM clients c
  LEFT JOIN last_messages lm ON c.id = lm.client_id
  LEFT JOIN unread_counts uc ON c.id = uc.client_id
  WHERE c.is_active = true
    AND (p_search IS NULL OR c.name ILIKE '%' || p_search || '%' OR c.phone ILIKE '%' || p_search || '%')
  ORDER BY lm.created_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
```

## Порядок действий

1. Выполнить SQL миграцию на self-hosted
2. Применить изменения в `useClientAvatars.ts` и `usePinnedChatThreads.ts`
3. Перезагрузить CRM и проверить отображение аватарок
