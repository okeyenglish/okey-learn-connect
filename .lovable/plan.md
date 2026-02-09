
# Fix: Кнопка "Не требует ответа" не работает для чатов преподавателей

## Проблема

Функция `handleMarkAsNoResponseNeeded` в `ChatArea.tsx` (строка 1074) жёстко использует:
- `.eq('client_id', clientId)` — но у преподавательских сообщений `client_id` может быть пустым, а идентификатор хранится в `teacher_id`
- `.eq('message_type', 'client')` — но преподавательские сообщения используют `is_outgoing = false` для входящих, а не `message_type: 'client'`

Поэтому запрос не находит ни одного сообщения и возвращает ошибку.

## Решение

### Файл: `src/components/crm/ChatArea.tsx`

Изменить `handleMarkAsNoResponseNeeded` (строки 1074-1146): добавить ветку для `isTeacherMessages || isDirectTeacherMessage`. В этом случае:

1. Определить `teacherId` из `clientId` (убрать префикс `teacher:` если есть) или из `clientUUID`
2. Выполнить update по `teacher_id` вместо `client_id`:
   ```typescript
   .update({ is_read: true })
   .eq('teacher_id', teacherId)
   .eq('is_outgoing', false)
   .or('is_read.is.null,is_read.eq.false')
   ```
3. Оптимистично обновить кэши `teacher-conversations`, `teacher-chats`, `teacher-chat-messages-v2-infinite` (обнулить `unreadCount`/`unreadMessages`, пометить сообщения как прочитанные)
4. Показать toast "Чат помечен как не требующий ответа"

### Детали оптимистичного обновления кэша

```typescript
// teacher-conversations
queryClient.setQueriesData({ queryKey: ['teacher-conversations'] }, (old) =>
  old?.map(c => c.teacherId === teacherId ? { ...c, unreadCount: 0 } : c)
);

// teacher-chats
queryClient.setQueriesData({ queryKey: ['teacher-chats'] }, (old) =>
  old?.map(t => t.id === teacherId ? { ...t, unreadMessages: 0 } : t)
);

// teacher-chat-messages-v2-infinite
queryClient.setQueriesData({ queryKey: ['teacher-chat-messages-v2-infinite'] }, (old) => ({
  ...old,
  pages: old?.pages?.map(page => ({
    ...page,
    messages: page.messages?.map(m => ({ ...m, is_read: true }))
  }))
}));
```

## Ожидаемый результат

- Кнопка "Не требует ответа" мгновенно помечает чат преподавателя как прочитанный
- Счётчик непрочитанных обновляется без задержки благодаря оптимистичному обновлению кэша
- Ошибка больше не появляется
