
# План исправления бесконечной загрузки чатов и сообщений

## Обнаруженная проблема

Функция `checkRpcAvailable()` в `useClientChatData.ts` **не имеет таймаута**. Если self-hosted сервер не отвечает или отвечает медленно, весь запрос зависает навсегда.

```typescript
// Текущий код (проблема)
const checkRpcAvailable = async (): Promise<boolean> => {
  // ... 
  const { error } = await supabase.rpc('get_client_chat_data', {...});
  // ⚠️ Нет таймаута - может зависнуть навсегда!
};
```

## Решение

### Шаг 1: Добавить таймаут в checkRpcAvailable

Изменить `src/hooks/useClientChatData.ts`:

```typescript
const RPC_CHECK_TIMEOUT_MS = 5000; // 5 секунд на проверку

const checkRpcAvailable = async (): Promise<boolean> => {
  if (rpcAvailable !== null) return rpcAvailable;
  if (rpcCheckPromise) return rpcCheckPromise;
  
  rpcCheckPromise = (async () => {
    try {
      // Добавить Promise.race с таймаутом
      const result = await Promise.race([
        supabase.rpc('get_client_chat_data', {
          p_client_id: '00000000-0000-0000-0000-000000000000',
          p_limit: 1
        }),
        new Promise<{ error: Error }>((resolve) =>
          setTimeout(() => resolve({ error: new Error('RPC check timeout') }), RPC_CHECK_TIMEOUT_MS)
        )
      ]);
      
      const error = result.error;
      rpcAvailable = !error?.message?.includes('function') && 
                     !error?.message?.includes('does not exist') &&
                     !error?.message?.includes('timeout');
      return rpcAvailable;
    } catch {
      rpcAvailable = false;
      return false;
    }
  })();
  
  return rpcCheckPromise;
};
```

### Шаг 2: Добавить таймаут в queryFn useClientChatData

```typescript
const QUERY_TIMEOUT_MS = 10000; // 10 секунд на запрос

queryFn: async (): Promise<ClientChatData> => {
  // ...
  const useRpc = await checkRpcAvailable();
  
  if (useRpc && !fallbackModeRef.current) {
    try {
      // Добавить таймаут к RPC вызову
      const result = await Promise.race([
        supabase.rpc('get_client_chat_data', { p_client_id: clientId, p_limit: limit }),
        new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error('Query timeout') }), QUERY_TIMEOUT_MS)
        )
      ]);
      // ...
    }
  }
  // Fallback ...
}
```

### Шаг 3: Убедиться что fallback всегда возвращает данные

Даже если все запросы провалятся, функция должна вернуть пустой результат:

```typescript
// В конце queryFn добавить гарантированный возврат
return {
  messages: [],
  hasMore: false,
  totalCount: 0,
  unreadCounts: {},
  avatars: { whatsapp: null, telegram: null, max: null }
};
```

## Файлы для изменения

1. `src/hooks/useClientChatData.ts` - добавить таймауты

## Ожидаемый результат

| Сценарий | До | После |
|----------|-----|-------|
| RPC проверка зависает | Бесконечная загрузка | Таймаут 5s → fallback |
| RPC запрос зависает | Бесконечная загрузка | Таймаут 10s → fallback |
| Сервер не отвечает | Зависание UI | Пустой список через 10-15s |
