

# Пометка сообщений как прочитанных при открытии чата

## Проблема

Сейчас `useMarkStaffMessagesRead` определён, но **нигде не вызывается**. Когда сотрудник открывает чат, сообщения остаются непрочитанными, а бейдж с количеством не исчезает.

Дополнительно: для групповых чатов запрос фильтрует по `recipient_user_id = user.id`, но в групповых сообщениях это поле пустое -- запрос ничего не находит.

Поскольку `is_read` -- общий флаг на строке сообщения, для групп нужна отдельная таблица `staff_chat_read_cursors`, хранящая "последнее время прочтения" для каждого пользователя в каждом чате.

## Решение

### 1. Новая таблица `staff_chat_read_cursors` (миграция)

```sql
CREATE TABLE IF NOT EXISTS staff_chat_read_cursors (
  user_id UUID NOT NULL,
  chat_id TEXT NOT NULL,        -- group_chat_id или recipient_user_id
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chat_id)
);

ALTER TABLE staff_chat_read_cursors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cursors"
  ON staff_chat_read_cursors FOR ALL
  USING (auth.uid() = user_id);
```

### 2. Хук `useMarkStaffChatRead` (новый, заменяет старый)

В `src/hooks/useInternalStaffMessages.ts` добавить:

```typescript
export const useMarkStaffChatRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (chatId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      await supabase
        .from('staff_chat_read_cursors')
        .upsert({
          user_id: user.id,
          chat_id: chatId,
          last_read_at: new Date().toISOString()
        }, { onConflict: 'user_id,chat_id' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-conversation-previews'] });
      queryClient.invalidateQueries({ queryKey: ['staff-group-previews'] });
      queryClient.invalidateQueries({ queryKey: ['staff-unread-count'] });
    }
  });
};
```

### 3. Вызов при открытии чата

В `handleSelectChat` в `AIHub.tsx` и `AIHubInline.tsx`:

```typescript
const markChatRead = useMarkStaffChatRead();

const handleSelectChat = async (item: ChatItem) => {
  // ... existing logic ...
  setActiveChat(item);
  
  // Mark as read
  if (item.type === 'teacher' || item.type === 'staff') {
    const profileId = item.type === 'teacher' 
      ? (item.data as TeacherChatItem)?.profileId 
      : (item.data as StaffMember)?.id;
    if (profileId) markChatRead.mutate(profileId);
  } else if (item.type === 'group') {
    markChatRead.mutate(item.id);
  }
};
```

Также помечать при получении новых сообщений, если чат уже открыт (в realtime-подписках).

### 4. Обновить подсчёт непрочитанных

В `useStaffConversationPreviews` и `useStaffGroupChatPreviews` -- вместо `is_read = false` считать непрочитанными сообщения, у которых `created_at > last_read_at` из таблицы курсоров:

- Загрузить курсоры текущего пользователя из `staff_chat_read_cursors`
- Для каждого чата: `unreadCount` = количество сообщений с `created_at > cursor.last_read_at` и `sender_id != user.id`

### 5. Обновить `useStaffUnreadCount` (общий счётчик)

Аналогично -- считать все DM и групповые сообщения, чей `created_at` позже соответствующего курсора.

## Порядок реализации

1. Создать миграцию с таблицей `staff_chat_read_cursors`
2. Добавить хук `useMarkStaffChatRead`
3. Вызвать `markChatRead` при открытии чата в обоих файлах
4. Обновить `useStaffConversationPreviews` и `useStaffGroupChatPreviews` для подсчёта непрочитанных через курсоры
5. Обновить `useStaffUnreadCount` через курсоры
6. Исправить build error (если остался)

## Результат

- Сотрудник открывает чат -- его курсор обновляется, бейдж пропадает
- Каждый сотрудник видит свой собственный счётчик непрочитанных
- Работает и для личных чатов, и для групповых
