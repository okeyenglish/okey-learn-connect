
# План: Исправление отображения сообщений после операций с задачами

## Проблема
При создании/выполнении/отмене задачи системное уведомление добавляется в `chat_messages`, но чат не обновляется из-за несовпадения query keys:

- `useSendMessage` (используется в task notifications) инвалидирует `['chat-messages', clientId]`
- `ChatArea` использует `useChatMessagesOptimized` с ключом `['chat-messages-optimized', clientId, limit]`

Поэтому после изменения задачи уведомление видно в списке чатов (preview), но не в самом чате.

## Решение

### Шаг 1: Обновить useSendMessage для инвалидации всех ключей

**Файл:** `src/hooks/useChatMessages.ts`

В хуке `useSendMessage` добавить инвалидацию дополнительных query keys:

```typescript
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: ['chat-messages', data.client_id] });
  // Добавить эти строки:
  queryClient.invalidateQueries({ 
    queryKey: ['chat-messages-optimized', data.client_id],
    exact: false  // Инвалидирует все варианты с разными limit
  });
  queryClient.invalidateQueries({ 
    queryKey: ['chat-messages-infinite-typed', data.client_id] 
  });
  queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
},
```

### Шаг 2: Обновить useCompleteTask и useCancelTask

**Файл:** `src/hooks/useTasks.ts`

Добавить инвалидацию сообщений чата после выполнения/отмены задачи для гарантированного обновления:

```typescript
// В useCompleteTask.onSuccess:
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
  // Добавить инвалидацию chat messages если есть client_id
  if (data.client_id) {
    queryClient.invalidateQueries({ 
      queryKey: ['chat-messages-optimized', data.client_id],
      exact: false 
    });
  }
  toast.success("Задача выполнена");
},
```

## Изменяемые файлы

| Файл | Изменение |
|------|-----------|
| `src/hooks/useChatMessages.ts` | Добавить инвалидацию `chat-messages-optimized` и `chat-messages-infinite-typed` в `useSendMessage` |
| `src/hooks/useTasks.ts` | Добавить инвалидацию сообщений чата в `useCompleteTask` и `useCancelTask` |

## Результат

После изменений:
- Уведомления о задачах появятся мгновенно в открытом чате
- Не будет рассинхрона между списком чатов и самим чатом
- Все query caches будут обновляться синхронно
