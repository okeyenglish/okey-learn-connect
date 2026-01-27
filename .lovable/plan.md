
# План: Улучшение форматов Push-уведомлений

## Обзор текущего состояния

Сейчас в системе есть следующие типы push-уведомлений:

| Тип | Функция | Текущий формат |
|-----|---------|----------------|
| Чат WhatsApp → менеджерам | `wappi-whatsapp-webhook` | `💬 Имя клиента` / `текст сообщения` |
| Чат Telegram → менеджерам | `telegram-webhook` | ❌ Не отправляет push |
| Чат MAX → менеджерам | `max-webhook` | ❌ Не отправляет push |
| Напоминание учителю | `lesson-reminders` | `⏰ Занятие через N мин` / `Группа в HH:MM` |
| Напоминание родителю | `parent-lesson-reminders` | Через ChatOS/WhatsApp, не push |
| Уведомления порталу | `notify-portal-users` | `Новое сообщение от Школы` / `текст` |

---

## Целевые форматы по типам уведомлений

### 1. Входящие сообщения в чат (для менеджеров)
```text
Title: Иван Иванов
Body: Хорошо, спасибо!
Icon: 💬 (WhatsApp) / ✈️ (Telegram) / 📨 (MAX)
```

### 2. Напоминание об уроке (для учителей)
```text
Title: 🎓 Английский в O'KEY ENGLISH
Body: Групповое занятие "Kids Box 2" через 60 мин
```

### 3. Напоминание об уроке (для родителей)
```text
Title: 📚 Английский в O'KEY ENGLISH
Body: Ждём Виктора на индивидуальное занятие через 1 час
```

### 4. Уведомление о непрочитанных сообщениях (для родителей в портале)
```text
Title: Мария Петрова (имя отправителя)
Body: Домашнее задание на завтра...
```

### 5. Пропущенный звонок (если добавить в будущем)
```text
Title: 📞 Пропущенный звонок
Body: +7 999 123-45-67 звонил в 14:30
```

---

## Технические изменения

### Файл 1: `supabase/functions/wappi-whatsapp-webhook/index.ts`
**Строки 355-366** — изменить формат push для входящих WhatsApp:

```typescript
// Было:
payload: {
  title: `💬 ${client.name}`,
  body: messageText.slice(0, 100) + ...,
}

// Станет:
const clientFullName = [client.first_name, client.last_name]
  .filter(Boolean).join(' ') || client.name || 'Клиент';

payload: {
  title: clientFullName,
  body: messageText.slice(0, 100) + (messageText.length > 100 ? '...' : ''),
  icon: '/pwa-192x192.png',
  url: `/crm?clientId=${client.id}`,
  tag: `chat-${client.id}`,
}
```

### Файл 2: `supabase/functions/telegram-webhook/index.ts`
**После строки ~196** (после `console.log('Incoming message saved successfully')`) — добавить push-уведомление:

```typescript
// Добавить push менеджерам для Telegram
try {
  const { data: chatUsers } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', ['admin', 'manager']);

  if (chatUsers && chatUsers.length > 0) {
    const userIds = chatUsers.map((u: { user_id: string }) => u.user_id);
    const clientFullName = client.first_name && client.last_name 
      ? `${client.first_name} ${client.last_name}`.trim()
      : client.name || senderName;
    
    await supabase.functions.invoke('send-push-notification', {
      body: {
        userIds,
        payload: {
          title: clientFullName,
          body: messageText.slice(0, 100) + (messageText.length > 100 ? '...' : ''),
          icon: '/pwa-192x192.png',
          url: `/crm?clientId=${client.id}`,
          tag: `chat-${client.id}`,
        },
      },
    });
  }
} catch (pushErr) {
  console.error('Error sending push notification:', pushErr);
}
```

### Файл 3: `supabase/functions/max-webhook/index.ts`
**После строки ~173** (после `console.log('Saved incoming MAX message')`) — добавить push-уведомление:

```typescript
// Добавить push менеджерам для MAX
try {
  const { data: chatUsers } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', ['admin', 'manager']);

  if (chatUsers && chatUsers.length > 0) {
    const userIds = chatUsers.map((u: { user_id: string }) => u.user_id);
    const clientFullName = client.first_name && client.last_name 
      ? `${client.first_name} ${client.last_name}`.trim()
      : client.name || senderName;
    
    await supabase.functions.invoke('send-push-notification', {
      body: {
        userIds,
        payload: {
          title: clientFullName,
          body: messageText.slice(0, 100) + (messageText.length > 100 ? '...' : ''),
          icon: '/pwa-192x192.png',
          url: `/crm?clientId=${client.id}`,
          tag: `chat-${client.id}`,
        },
      },
    });
  }
} catch (pushErr) {
  console.error('Error sending push notification:', pushErr);
}
```

### Файл 4: `supabase/functions/lesson-reminders/index.ts`
**Строки 259-270** — улучшить формат напоминаний учителям:

```typescript
// Было:
payload: {
  title: `⏰ Занятие через ${Math.round(minutesUntilLesson)} мин`,
  body: reminderText,
}

// Станет:
// Получить название организации
const { data: orgData } = await supabase
  .from('organizations')
  .select('name')
  .eq('id', lessonData?.organization_id)
  .single();

const orgName = orgData?.name || "O'KEY ENGLISH";
const groupName = lesson.learning_groups?.name || 'Группа';
const isGroup = groupName.toLowerCase().includes('группа') || 
                groupName.toLowerCase().includes('group');
const lessonType = isGroup ? 'Групповое занятие' : 'Индивидуальное занятие';

payload: {
  title: `🎓 Английский в ${orgName}`,
  body: `${lessonType} "${groupName}" через ${Math.round(minutesUntilLesson)} мин`,
  icon: '/pwa-192x192.png',
  url: '/teacher-portal?tab=schedule',
  tag: `lesson-${lesson.id}-${Date.now()}`,
}
```

### Файл 5: `supabase/functions/parent-lesson-reminders/index.ts`
**Строка 232** — улучшить формат сообщения родителям:

```typescript
// Было:
const message = `👋 Напоминание!\n\n🎓 ${studentName} — занятие "${groupName}"\n📅 Сегодня в ${lesson.start_time}\n⏰ До начала ~${Math.round(minutesUntilLesson)} минут`;

// Станет (для WhatsApp/ChatOS):
const { data: orgData } = await supabase
  .from('organizations')
  .select('name')
  .eq('id', lesson.organization_id)
  .single();

const orgName = orgData?.name || "O'KEY ENGLISH";
const firstName = student.first_name || studentName.split(' ')[0];
const isIndividual = groupName.toLowerCase().includes('инд') || 
                     groupName.toLowerCase().includes('individual');
const lessonType = isIndividual ? 'индивидуальное' : 'групповое';

const message = `📚 ${orgName}\n\nЖдём ${firstName} на ${lessonType} занятие через ${Math.round(minutesUntilLesson)} мин.\n⏰ Начало в ${lesson.start_time}`;
```

### Файл 6: `supabase/functions/notify-portal-users/index.ts`
**Строки 108-158** — добавить получение имени отправителя:

```typescript
// Было (строки 152-158):
const notificationTitle = unreadCount === 1
  ? `Новое сообщение от ${schoolName}`
  : `${unreadCount} новых сообщений`;

const notificationBody = unreadCount === 1
  ? messagePreview
  : `Последнее: "${messagePreview}"`;

// Станет:
// Получить имя отправителя последнего сообщения
const { data: lastMsgData } = await supabase
  .from('chat_messages')
  .select('sender_name')
  .eq('client_id', notification.id)
  .eq('direction', 'outgoing')
  .eq('is_read', false)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

const senderName = lastMsgData?.sender_name || schoolName;

const notificationTitle = unreadCount === 1
  ? senderName
  : `${senderName} и ещё ${unreadCount - 1}`;

const notificationBody = messagePreview;
```

---

## Итоговый формат по типам

| Тип уведомления | Title | Body |
|-----------------|-------|------|
| WhatsApp → менеджер | Иван Иванов | Текст сообщения... |
| Telegram → менеджер | Мария Петрова | Текст сообщения... |
| MAX → менеджер | Сергей Сидоров | Текст сообщения... |
| Урок → учитель | 🎓 Английский в O'KEY ENGLISH | Групповое занятие "Kids Box 2" через 60 мин |
| Урок → родитель | 📚 O'KEY ENGLISH | Ждём Виктора на индивидуальное занятие через 1 час |
| Портал → родитель | Анна Преподавателева | Домашнее задание на завтра... |

---

## Дополнительные улучшения (опционально)

1. **Добавить эмодзи мессенджера в тег** для группировки уведомлений:
   - `tag: 'whatsapp-chat-{clientId}'`
   - `tag: 'telegram-chat-{clientId}'`
   - `tag: 'max-chat-{clientId}'`

2. **Добавить аватар клиента** в уведомление (если доступен):
   ```typescript
   icon: client.avatar_url || '/pwa-192x192.png',
   ```

3. **Звуковое уведомление** — настроить разные звуки для разных типов (требует настройки на стороне клиента).
