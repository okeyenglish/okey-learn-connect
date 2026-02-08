

## Диагностика: Белый экран при клике на чат преподавателя

### Корневая причина

При выборе чата преподавателя система генерирует специальный идентификатор `clientId = 'teacher:${teacherId}'` вместо реального UUID клиента. Этот маркер правильно обрабатывается для загрузки сообщений, но **несколько хуков в ChatArea.tsx не проверяют формат clientId** и передают его напрямую в SQL-запросы.

Когда PostgreSQL получает `filter: client_id=eq.teacher:4d8b2754-...`, он выбрасывает ошибку:
```
invalid input syntax for type uuid: "teacher:4d8b2754-7f71-4abd-992a-7d5f0072d0aa"
```

Эта ошибка происходит в асинхронном callback (useEffect / realtime subscription) и **не перехватывается ErrorBoundary**, что приводит к краху React и белому экрану.

### Проблемные хуки (ChatArea.tsx)

| Строка | Хук | Проблема |
|--------|-----|----------|
| 349 | `useClientAvatars(clientId)` | Запрос к `clients` таблице с невалидным UUID |
| 358 | `useTypingStatus(clientId)` | Upsert в `typing_status` с невалидным UUID |
| 485 | `useMessageStatusRealtime(clientId)` | Realtime filter с невалидным UUID |
| 586 | `useNewMessageRealtime(clientId)` | Realtime filter с невалидным UUID |
| 493 | `useClientUnreadByMessenger(clientId)` | Запрос с невалидным UUID |
| 496 | `useViewedMissedCalls(clientId)` | Запрос с невалидным UUID |
| 499 | `useCallLogsRealtime(clientId)` | Realtime filter с невалидным UUID |

### Решение

Добавить проверку `isValidUUID` перед передачей `clientId` в хуки, которые ожидают валидный UUID. Для преподавательских чатов (`isDirectTeacherMessage = true`) эти хуки должны получать `undefined` или быть отключены.

### Изменения в ChatArea.tsx

```typescript
// Добавить валидатор UUID (можно импортировать из useChatPresence)
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Безопасный clientId для хуков, требующих UUID
const safeClientId = isDirectTeacherMessage ? null : clientId;
const safeClientIdForQuery = isDirectTeacherMessage || !isValidUUID(clientId) ? undefined : clientId;
```

Затем обновить вызовы хуков:

| Хук | Было | Станет |
|-----|------|--------|
| `useClientAvatars` | `useClientAvatars(clientId)` | `useClientAvatars(safeClientIdForQuery ?? null)` |
| `useTypingStatus` | `useTypingStatus(clientId)` | `useTypingStatus(safeClientIdForQuery ?? '')` |
| `useMessageStatusRealtime` | `useMessageStatusRealtime(clientId, ...)` | `useMessageStatusRealtime(safeClientIdForQuery ?? '', ...)` |
| `useNewMessageRealtime` | `useNewMessageRealtime(clientId, ...)` | `useNewMessageRealtime(safeClientIdForQuery ?? '', ...)` |
| `useClientUnreadByMessenger` | `useClientUnreadByMessenger(clientId)` | `useClientUnreadByMessenger(safeClientIdForQuery ?? '')` |
| `useViewedMissedCalls` | `useViewedMissedCalls(clientId)` | `useViewedMissedCalls(safeClientIdForQuery ?? '')` |
| `useCallLogsRealtime` | `useCallLogsRealtime(clientId)` | `useCallLogsRealtime(safeClientIdForQuery)` |

### Дополнительная защита в хуках

Для надёжности добавить проверки UUID внутри самих хуков:

**useClientAvatars.ts (строка 33):**
```typescript
const loadAvatars = useCallback(async () => {
  // Skip for non-UUID clientIds (teacher markers)
  if (!clientId || !isValidUUID(clientId)) return;
  ...
});
```

**useTypingStatus.ts (строка 46 и 188):**
```typescript
const fetchTypingUsers = useCallback(async () => {
  if (!clientId || !isValidUUID(clientId)) return;
  ...
});
```

### Файлы для изменения

| Файл | Изменения |
|------|-----------|
| `src/components/crm/ChatArea.tsx` | Добавить `isValidUUID`, создать `safeClientIdForQuery`, обновить 7+ вызовов хуков |
| `src/hooks/useClientAvatars.ts` | Добавить проверку UUID в `loadAvatars` |
| `src/hooks/useTypingStatus.ts` | Добавить проверку UUID в `fetchTypingUsers` и `doUpdateTypingStatus` |
| `src/hooks/useChatMessagesOptimized.ts` | Добавить проверку UUID в `useNewMessageRealtime` и `useMessageStatusRealtime` |

### Результат

После исправления:
1. Клики на чаты преподавателей не будут вызывать ошибки БД
2. Хуки для клиентских функций (аватары, typing, presence) будут безопасно пропускаться
3. Сообщения будут загружаться через правильный хук `useTeacherChatMessagesByTeacherId`
4. Белый экран исчезнет

