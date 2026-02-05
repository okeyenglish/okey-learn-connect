
## Исправление: Отображение сообщений преподавателей

### Корневая причина

Проблема в архитектурном несоответствии:

| Хук | Метод поиска сообщений | Работает? |
|-----|------------------------|-----------|
| `useTeacherConversations.ts` | `teacher_id` напрямую в `chat_messages` | Да (но не используется) |
| `useTeacherChats.ts` | Через `clients` по телефону | Нет (клиенты не совпадают) |

`TeacherChatArea.tsx` использует `useTeacherChats`, который ищет сообщения через matching телефонов преподавателей с клиентами. Но на self-hosted сообщения хранятся напрямую с `teacher_id` в `chat_messages`, без связи с таблицей `clients`.

### План исправления

#### Файл: `src/hooks/useTeacherChats.ts`

**1. Добавить прямой поиск по `teacher_id` в начале fallback логики**

Перед текущей логикой поиска через `clients` (строки 260-380), добавить попытку найти сообщения напрямую по `teacher_id`:

```text
// НОВЫЙ БЛОК: Прямой поиск по teacher_id (строки ~262-295)

// Step 1: Try direct teacher_id query (new architecture)
const teacherIds = teachersList.map(t => t.id);

const { data: directMessages, error: directError } = await supabase
  .from('chat_messages')
  .select('teacher_id, message_text, content, created_at, messenger_type, messenger, is_read, is_outgoing')
  .in('teacher_id', teacherIds)
  .order('created_at', { ascending: false });

// If direct query works and returns data, use it
if (!directError && directMessages && directMessages.length > 0) {
  console.log('[useTeacherChats] Found messages via teacher_id:', directMessages.length);
  
  // Group by teacher_id
  const messagesByTeacher = new Map();
  directMessages.forEach(msg => {
    if (!msg.teacher_id) return;
    if (!messagesByTeacher.has(msg.teacher_id)) {
      messagesByTeacher.set(msg.teacher_id, []);
    }
    messagesByTeacher.get(msg.teacher_id).push(msg);
  });
  
  // Build results
  const results = [];
  teachersList.forEach(teacher => {
    const messages = messagesByTeacher.get(teacher.id);
    if (messages && messages.length > 0) {
      const lastMsg = messages[0];
      const unreadCount = messages.filter(m => 
        !m.is_read && (m.is_outgoing === false)
      ).length;
      
      results.push({
        teacher_id: teacher.id,
        client_id: null, // Direct teacher messages don't use client_id
        unread_count: unreadCount,
        last_message_time: lastMsg.created_at,
        last_message_text: lastMsg.message_text || lastMsg.content || null,
        last_messenger_type: lastMsg.messenger_type || lastMsg.messenger || null,
      });
    }
  });
  
  if (results.length > 0) {
    console.log('[useTeacherChats] Direct teacher_id query returned', results.length, 'conversations');
    return results;
  }
}

console.log('[useTeacherChats] No messages via teacher_id, falling back to client matching...');

// EXISTING CODE CONTINUES (client matching via phone)
```

**2. Обработка отсутствия колонки `teacher_id`**

Если колонка `teacher_id` не существует в `chat_messages` (ошибка 42703), продолжить с текущей логикой:

```text
if (directError) {
  // Column might not exist - fall back to client matching
  if (directError.code === '42703') {
    console.log('[useTeacherChats] teacher_id column not found, using client fallback');
  } else {
    console.warn('[useTeacherChats] Direct query error:', directError);
  }
}
```

**3. Обновить `TeacherChatItem.clientId` для поддержки null**

Для сообщений с `teacher_id` напрямую, `clientId` будет `null`. Нужно обновить компонент `ChatArea` или добавить логику разрешения:

В `TeacherChatArea.tsx` (строки 146-170), добавить альтернативную ветку:

```text
// If teacher has messages via teacher_id (no clientId), use special handling
if (!teacher.clientId && teacher.lastMessageTime) {
  // Messages exist via teacher_id - pass teacherId to ChatArea
  // ChatArea should handle teacherId-based message loading
  setResolvedClientId(`teacher:${selectedTeacherId}`);
  return;
}
```

### Изменяемые файлы

| Файл | Изменения |
|------|-----------|
| `src/hooks/useTeacherChats.ts` | Добавить прямой поиск по `teacher_id` перед fallback |
| `src/components/crm/TeacherChatArea.tsx` | Обработать случай когда `clientId = null` но сообщения есть |

### Ожидаемый результат

1. Сообщения преподавателей из salebot/WhatsApp/Telegram будут отображаться
2. Превью последнего сообщения появится в списке
3. Счётчик непрочитанных будет работать
4. Обратная совместимость со старой архитектурой (через clients) сохранится
