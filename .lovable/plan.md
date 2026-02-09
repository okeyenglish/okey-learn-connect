

# Fix: Неправильный подсчёт непрочитанных в папке "Преподаватели"

## Проблема

Число "45" в папке "Преподаватели" не соответствует реальному количеству непрочитанных сообщений. Причины:

1. **Ограничение выборки**: `useTeacherConversations` загружает только 5 последних сообщений на преподавателя (`limit: batchIds.length * 5`). Если у преподавателя 26 непрочитанных — будет подсчитано максимум 5.

2. **Двойной источник данных**: В `useSystemChatMessages` используется логика "или-или" — берётся `conversationsUnread` (из `useTeacherConversations`) или `teachersTotalUnread` (из `useTeacherChats`). Оба могут быть неточными.

3. **Системные сообщения не исключаются**: Оба хука считают все сообщения с `is_read=false && is_outgoing=false`, включая системные (`message_type: 'system'`), что завышает счётчик.

## Решение

### Изменение 1: `src/hooks/useTeacherConversations.ts` — увеличить лимит и исключить системные

- Увеличить лимит сообщений с `batchIds.length * 5` до `batchIds.length * 50` для корректного подсчёта непрочитанных
- Добавить фильтр `.neq('message_type', 'system')` в запрос или исключать системные при подсчёте

### Изменение 2: `src/hooks/useTeacherChats.ts` — исключить системные сообщения из подсчёта

- В fallback-логике (строки 319-321 и 416-418) добавить фильтр `m.message_type !== 'system'` при подсчёте `unreadCount`
- Увеличить лимит с `teacherIds.length * 20` до `teacherIds.length * 50`

### Изменение 3: `src/hooks/useSystemChatMessages.ts` — суммировать из правильного источника

- Вместо логики "или-или" на строке 189 использовать сумму непрочитанных из `teacherChats` (уже объединённых данных), чтобы итоговое число точно соответствовало тому, что видно в списке преподавателей

Было:
```typescript
const effectiveTeachersUnread = conversationsUnread > 0 ? conversationsUnread : teachersTotalUnread;
```

Станет:
```typescript
const effectiveTeachersUnread = teacherChats.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
```

## Технические детали

### Файл: `src/hooks/useTeacherConversations.ts`
- Строка 73: изменить `limit(batchIds.length * 5)` на `limit(batchIds.length * 50)`
- Строка 100-103: добавить `&& m.message_type !== 'system'` в фильтр unread

### Файл: `src/hooks/useTeacherChats.ts`
- Строка 288: изменить `limit(teacherIds.length * 20)` на `limit(teacherIds.length * 50)`
- Строка 319-321: добавить `&& m.message_type !== 'system'` в фильтр
- Строка 416-418: добавить `&& m.message_type !== 'system'` в фильтр

### Файл: `src/hooks/useSystemChatMessages.ts`
- Строка 189: заменить логику "или-или" на суммирование из уже объединённого `teacherChats`

## Ожидаемый результат

- Число в папке "Преподаватели" точно соответствует сумме непрочитанных по всем преподавателям в списке
- Системные уведомления не влияют на счётчик
- Преподаватели с большим количеством непрочитанных (26+) корректно учитываются

