
# План исправления бесконечной "Загрузки данных"

## Проблема

На главной странице CRM индикатор "Загрузка данных..." остаётся бесконечно. Проблема вызвана тем, что один из хуков загрузки данных не завершается корректно.

## Анализ причины

Индикатор показывается когда выполняется условие:
```javascript
threadsLoading || pinnedLoading || chatStatesLoading || systemChatsLoading
```

Из анализа кода и логов консоли выявлено:

1. **RPC-вызовы без таймаута** - в `useChatThreadsInfinite` вызовы к `get_chat_threads_paginated` и `get_unread_chat_threads` не имеют таймаута
2. **Self-hosted сервер возвращает 500** - в логах видны ошибки `[selfHostedFetch] Retry 2/3 for bulk-fetch-avatars after 1626ms (status: 500)`
3. **Отсутствие логов загрузки** - нет сообщений `[useChatThreadsInfinite] Loading page 0...`, что указывает на зависание RPC

Если RPC-функция зависает (долгий запрос, нет индексов, перегрузка сервера), клиент будет ждать бесконечно, так как Supabase JS SDK не имеет встроенного таймаута.

## Решение

### Шаг 1: Добавить таймауты к RPC в useChatThreadsInfinite

Изменить `src/hooks/useChatThreadsInfinite.ts`:

```text
// Добавить helper функцию с таймаутом
const rpcWithTimeout = async <T>(
  rpcCall: () => Promise<{ data: T | null; error: any }>,
  timeoutMs: number = 8000
): Promise<{ data: T | null; error: any }> => {
  return Promise.race([
    rpcCall(),
    new Promise<{ data: null; error: Error }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: new Error('RPC timeout') }), timeoutMs)
    )
  ]);
};
```

Применить к обоим запросам:
- `get_chat_threads_paginated` 
- `get_unread_chat_threads`

### Шаг 2: Улучшить fallback логику

Если RPC не отвечает или возвращает ошибку:
1. Сначала попробовать `get_chat_threads_fast` (более простая RPC)
2. Если и она не работает - fallback на прямой SELECT с LIMIT

```text
// Fallback цепочка:
1. get_chat_threads_paginated (8s timeout)
2. get_chat_threads_fast (5s timeout)  
3. Прямой SELECT из chat_messages + clients (последний resort)
```

### Шаг 3: Добавить retry с меньшим таймаутом

В конфигурации React Query для threads:

```text
{
  retry: 2,
  retryDelay: 1000,
  // staleTime и gcTime остаются
}
```

### Шаг 4: Логирование для диагностики

Добавить console.log в начале queryFn для отслеживания того, что запрос начался:

```text
console.log('[useChatThreadsInfinite] Starting queryFn for page', pageParam);
```

## Файлы для изменения

1. `src/hooks/useChatThreadsInfinite.ts` - добавить таймауты и fallback
2. `src/lib/queryConfig.ts` - добавить retry настройки для критических запросов

## Ожидаемый результат

| Сценарий | До | После |
|----------|-----|-------|
| RPC работает | Загрузка ~500ms | Без изменений |
| RPC зависает | Бесконечная загрузка | Таймаут 8s → fallback |
| RPC отсутствует | Ошибка, retry бесконечно | Fallback на прямой SQL |
| Сервер 500 | Бесконечные retry | 2 retry → показать пустой список |
