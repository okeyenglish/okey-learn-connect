

# Fix: Ошибка при отметке чата преподавателя как прочитанного

## Проблема

В `TeacherChatArea.tsx` функция `handleMarkRead` (строка 447) ищет `clientId` у преподавателя и использует `.eq('client_id', clientId)` для обновления сообщений. Но преподаватели, которые пишут напрямую (через `teacher_id` в `chat_messages`), **не имеют клиентской записи**. Поэтому `clientId` = `undefined`, и выводится ошибка "Не удалось найти клиента для этого преподавателя".

## Решение

### Файл: `src/components/crm/TeacherChatArea.tsx`

Изменить `handleMarkRead` (строки 447-492): вместо поиска `clientId` и фильтрации по `client_id`, использовать `teacher_id` напрямую. Если `clientId` есть — обновлять по обоим полям (OR), если нет — только по `teacher_id`.

```typescript
const handleMarkRead = useCallback(async (teacherId: string) => {
  try {
    // Mark messages as read using teacher_id directly
    const { error } = await (supabase
      .from('chat_messages') as any)
      .update({ is_read: true })
      .eq('teacher_id', teacherId)
      .eq('is_outgoing', false)
      .or('is_read.is.null,is_read.eq.false');

    if (error) {
      console.error('Error marking as read:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отметить как прочитанное",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Отмечено прочитанным",
      description: "Чат отмечен как прочитанный",
    });

    refetchAllTeacherData();
  } catch (error) {
    console.error('Error in handleMarkRead:', error);
  }
}, [toast, refetchAllTeacherData]);
```

Аналогично исправить `handleMarkUnread` (строки 383-445) — он тоже зависит от `clientId` и может падать с той же ошибкой.

## Ожидаемый результат

- Кнопка "Прочитано" работает для всех преподавателей, включая тех, у кого нет клиентской записи
- Сообщения корректно помечаются как прочитанные через `teacher_id`
- Счётчик непрочитанных обновляется после отметки

