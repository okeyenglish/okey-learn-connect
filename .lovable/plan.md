

# Консолидация Realtime-каналов и снижение CPU нагрузки

## Текущая проблема

При открытии CRM одним менеджером создается **15-25 отдельных `postgres_changes` каналов**. Каждый канал заставляет PostgreSQL декодировать WAL для соответствующей таблицы, что при 5-10 менеджерах дает 100+ активных подписок и всплески CPU до 600%.

## Полная инвентаризация текущих каналов

### Таблица `chat_messages` -- 5 дублирующихся каналов:
1. `useOrganizationRealtimeMessages` -- INSERT/UPDATE/DELETE (главный)
2. `useChatNotificationSound` -- INSERT (дублирует звук уведомления)
3. `useNewMessageHighlight` -- INSERT incoming (подсветка в списке)
4. `useChatMessagesOptimized` -- INSERT + UPDATE per client (при открытом чате)
5. `useChatMessages` -- INSERT + UPDATE per client (старый хук)

### Таблица `chat_states` -- 3 канала:
1. `useRealtimeHub` -- уже консолидирован
2. `usePinnedChatIds` -- per user
3. `useSharedChatStates` -- без фильтра

### Таблица `tasks` -- 4 канала:
1. `useRealtimeHub` -- уже консолидирован
2. `useTasks` (useClientTasks) -- per client
3. `useTasks` (useAllTasks) -- все
4. `useTasks` (useTasksByDate) -- per date

### Таблица `clients` -- 1 канал:
- `useRealtimeClients` -- debounced

### Таблица `global_chat_read_status` -- 1 канал:
- `useGlobalChatReadStatus`

### Таблица `pinned_modals` -- 1 канал:
- `usePinnedModalsDB`

### Таблица `lesson_sessions` -- 2+ каналов:
1. `useRealtimeHub` -- консолидирован
2. `useLessonSessions` -- дубль
3. `useStudentGroupLessonSessions` -- per group (при открытии карточки)
4. `useIndividualLessonSessions` -- per lesson

### Прочие (открываются при навигации):
- `staff_activity_log`, `payments`, `student_lesson_sessions`, `whatsapp_sessions`, `call_logs`, `assistant_messages`, `teacher_chat_states`, `teacher_messages`, `custom_chats`

## План оптимизации (3 этапа)

### Этап 1: Убрать дублирующиеся каналы chat_messages

`useOrganizationRealtimeMessages` уже подписан на все INSERT/UPDATE/DELETE для `chat_messages`. Удаляем дублирующие подписки:

- **`useChatNotificationSound`** -- убрать `postgres_changes`, получать события через callback из `useOrganizationRealtimeMessages`
- **`useNewMessageHighlight`** -- убрать `postgres_changes`, получать события через callback из `useOrganizationRealtimeMessages`
- **`useChatMessagesOptimized`** -- убрать собственные каналы (2 штуки), так как `useOrganizationRealtimeMessages` уже invalidates per-client queries

Результат: **-4 канала** на `chat_messages`

### Этап 2: Убрать дублирующие каналы tasks и chat_states

`useRealtimeHub` уже подписан на `tasks`, `chat_states`, `lesson_sessions`. Удаляем дубли:

- **`useTasks`** (3 хука) -- убрать 3 `postgres_changes` канала, `useRealtimeHub` уже invalidates все query keys
- **`usePinnedChatIds`** -- убрать `postgres_changes`, `useRealtimeHub` уже invalidates `pinned-chat-ids`
- **`useSharedChatStates`** -- убрать `postgres_changes`, оставить только broadcast канал `chat-states-bus`
- **`useLessonSessions`** -- убрать `postgres_changes`, `useRealtimeHub` уже invalidates `lesson-sessions`

Результат: **-6 каналов**

### Этап 3: Перевести некритичные таблицы на polling

- **`global_chat_read_status`** -- polling 15 сек (read status не требует мгновенности)
- **`pinned_modals`** -- polling 30 сек (закрепление окон меняется редко)
- **`clients`** -- polling 30 сек (клиенты меняются нечасто)
- **`staff_activity_log`** -- polling 15 сек (уже имеет query с staleTime)

Результат: **-4 канала**

## Расширение useOrganizationRealtimeMessages

Добавляем систему callback-подписчиков, чтобы другие хуки могли реагировать на события без создания своих каналов:

```text
// В useOrganizationRealtimeMessages добавляем:
type MessageEventCallback = (payload: ChatMessagePayload, eventType: string) => void;

// Публичный API:
onMessageEvent(callback)   // подписка
offMessageEvent(callback)  // отписка

// Использование в useChatNotificationSound:
const { onMessageEvent, offMessageEvent } = useOrganizationRealtimeMessages();
useEffect(() => {
  onMessageEvent(handleNewMessage);
  return () => offMessageEvent(handleNewMessage);
}, []);
```

## Итоговый результат

| До | После |
|----|-------|
| ~20 postgres_changes каналов | ~6 каналов |
| 5 подписок на chat_messages | 1 подписка |
| 4 подписки на tasks | 1 подписка (RealtimeHub) |
| 3 подписки на chat_states | 1 подписка (RealtimeHub) |

## Файлы для изменения

1. `src/hooks/useOrganizationRealtimeMessages.ts` -- добавить callback registry
2. `src/hooks/useChatNotificationSound.ts` -- заменить postgres_changes на callback
3. `src/hooks/useNewMessageHighlight.ts` -- заменить postgres_changes на callback
4. `src/hooks/useChatMessagesOptimized.ts` -- убрать 2 собственных канала
5. `src/hooks/useChatMessages.ts` -- убрать postgres_changes
6. `src/hooks/useTasks.ts` -- убрать 3 канала postgres_changes
7. `src/hooks/usePinnedChatIds.ts` -- убрать postgres_changes
8. `src/hooks/useSharedChatStates.ts` -- убрать postgres_changes, оставить broadcast
9. `src/hooks/useLessonSessions.ts` -- убрать postgres_changes
10. `src/hooks/useGlobalChatReadStatus.ts` -- заменить на polling
11. `src/hooks/usePinnedModalsDB.ts` -- заменить на polling
12. `src/hooks/useRealtimeClients.ts` -- заменить на polling
13. `src/hooks/useStaffActivityLog.ts` -- заменить на polling
14. `src/pages/crm/providers/CRMRealtimeProvider.tsx` -- передавать callback registry через context

