
# Fix: Кнопка "Не требует ответа" подвисает

## Корневая причина

Кнопка работает корректно (сообщения помечаются как прочитанные в базе), но **UI не обновляется** из-за двух проблем:

1. **Материализованное представление (MV)**: Счетчик непрочитанных (`unread_count`) в списке чатов берётся из `chat_threads_mv`, которое обновляется по расписанию, а не мгновенно. После нажатия кнопки MV всё ещё содержит старое значение.

2. **Не инвалидируется `unread-client-ids`**: Функция `handleMarkAsNoResponseNeeded` не инвалидирует кэш `unread-client-ids`, который определяет какие клиенты имеют непрочитанные сообщения.

## Решение

### Изменение 1: Оптимистичное обновление кэша `chat-threads`

В `handleMarkAsNoResponseNeeded` (файл `src/components/crm/ChatArea.tsx`) вместо простого `invalidateQueries` сделать **оптимистичное обновление** кэша:

- Сразу после успешного `update` установить `unread_count = 0` для текущего клиента в кэше `chat-threads`
- Это даст мгновенный визуальный отклик, не дожидаясь обновления MV

### Изменение 2: Добавить инвалидацию `unread-client-ids`

Добавить `queryClient.invalidateQueries({ queryKey: ['unread-client-ids'] })` в `handleMarkAsNoResponseNeeded`, чтобы список непрочитанных клиентов тоже обновился.

### Изменение 3: Принудительный refetch после обновления

Заменить `invalidateQueries` на `refetchQueries` с `{type: 'active'}` для ключевых запросов, чтобы данные перезапрашивались немедленно, а не ожидали условий `staleTime`.

## Технические детали

### Файл: `src/components/crm/ChatArea.tsx`

Функция `handleMarkAsNoResponseNeeded` (~строки 1074-1111):

```typescript
const handleMarkAsNoResponseNeeded = async () => {
  if (!clientId) return;
  
  try {
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('client_id', clientId)
      .eq('is_read', false)
      .eq('message_type', 'client');
    
    if (error) {
      console.error('Error marking messages as read:', error);
      toast({ title: "Ошибка", description: "...", variant: "destructive" });
      return;
    }
    
    // НОВОЕ: Оптимистичное обновление кэша chat-threads
    queryClient.setQueriesData(
      { queryKey: ['chat-threads'] },
      (old: ChatThread[] | undefined) => {
        if (!old) return old;
        return old.map(t => 
          t.client_id === clientId 
            ? { ...t, unread_count: 0 } 
            : t
        );
      }
    );
    
    // НОВОЕ: Убрать клиента из unread-client-ids
    queryClient.setQueriesData(
      { queryKey: ['unread-client-ids'] },
      (old: string[] | undefined) => {
        if (!old) return old;
        return old.filter(id => id !== clientId);
      }
    );
    
    // Инвалидируем остальные кэши
    queryClient.invalidateQueries({ queryKey: ['client-unread-by-messenger', clientId] });
    queryClient.invalidateQueries({ queryKey: ['chat-threads-infinite'] });
    queryClient.invalidateQueries({ queryKey: ['chat-threads-unread-priority'] });
    queryClient.invalidateQueries({ queryKey: ['chat-messages', clientId] });
    queryClient.invalidateQueries({ queryKey: ['chat-messages-infinite', clientId] });
    
    toast({ title: "Готово", description: "Чат помечен как не требующий ответа" });
  } catch (error) {
    console.error('Error in handleMarkAsNoResponseNeeded:', error);
  }
};
```

### Ожидаемый результат

- Счетчик непрочитанных в списке чатов обнулится **мгновенно** после нажатия кнопки
- Чат переместится в правильную позицию в списке (не "сверху" среди непрочитанных)
- При следующем обновлении MV данные синхронизируются с оптимистичным обновлением
