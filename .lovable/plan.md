

# План исправления блокировки загрузки чатов

## Диагностика

RPC `get_chat_threads_paginated` не существует на self-hosted базе. Это приводит к тому, что:
1. `infiniteQuery.isLoading = true` застревает навсегда (или до таймаута)
2. `unreadQuery` успешно возвращает 50 клиентов
3. Но `isLoading: infiniteQuery.isLoading || unreadQuery.isLoading` = true, блокируя UI

## Решение

Изменить логику так, чтобы unreadQuery данные показывались сразу, не дожидаясь infiniteQuery.

### Изменение 1: Независимый isLoading для unread чатов

**Файл:** `src/hooks/useChatThreadsInfinite.ts`

**Текущая логика (строка ~236):**
```typescript
return {
  data: allThreads,
  isLoading: infiniteQuery.isLoading || unreadQuery.isLoading,
  // ...
};
```

**Новая логика:**
```typescript
// Показываем данные как только unreadQuery готов
// infiniteQuery загружает дополнительные страницы в фоне
const hasInitialData = (unreadQuery.data && unreadQuery.data.length > 0) || 
                       (infiniteQuery.data?.pages && infiniteQuery.data.pages.length > 0);

return {
  data: allThreads,
  isLoading: !hasInitialData && (infiniteQuery.isLoading || unreadQuery.isLoading),
  // ...
};
```

### Изменение 2: Fallback для отсутствующего RPC

Добавить отключение `infiniteQuery` если RPC не существует (аналогично логике для `get_unread_chat_threads`):

```typescript
// Флаг для отключения сломанного RPC
let usePaginatedRpc = true;

const infiniteQuery = useInfiniteQuery({
  queryKey: ['chat-threads-infinite'],
  queryFn: async ({ pageParam = 0 }) => {
    // Если RPC сломан - возвращаем пустую страницу
    if (!usePaginatedRpc) {
      return { threads: [], hasMore: false, pageParam, executionTime: 0 };
    }

    const { data, error } = await supabase
      .rpc('get_chat_threads_paginated', { ... });

    if (error) {
      // Если function not found - отключаем RPC навсегда
      if (error.code === '42883' || error.code === 'PGRST202') {
        console.warn('[useChatThreadsInfinite] Disabling broken paginated RPC');
        usePaginatedRpc = false;
        return { threads: [], hasMore: false, pageParam, executionTime: 0 };
      }
      // Иначе пробуем fallback
      // ...
    }
    // ...
  },
  retry: (failureCount, error: any) => {
    // Не ретраить если функция не существует
    if (error?.code === '42883' || error?.code === 'PGRST202') return false;
    return failureCount < 1;
  },
});
```

### Изменение 3: Приоритет unread данных в allThreads

Убедиться что unread данные всегда показываются первыми:

```typescript
const allThreads = useMemo(() => {
  const unreadThreads = unreadQuery.data || [];
  
  // Если есть unread данные - показываем их сразу
  // даже если infiniteQuery ещё не загрузился
  if (unreadThreads.length > 0 && !infiniteQuery.data?.pages?.length) {
    return unreadThreads.filter(t => !deletedIdsSet.has(t.client_id));
  }
  
  // Остальная логика мерджа...
}, [unreadQuery.data, infiniteQuery.data?.pages, deletedIdsSet]);
```

---

## Файлы для изменения

| Файл | Действие |
|------|----------|
| `src/hooks/useChatThreadsInfinite.ts` | Изменить логику isLoading и добавить fallback |

---

## Результат

1. Чаты из `get_unread_chat_threads` будут показываться сразу (50 клиентов)
2. Если `get_chat_threads_paginated` не существует - он автоматически отключится
3. Пользователь увидит непрочитанные чаты мгновенно, не дожидаясь пагинации

