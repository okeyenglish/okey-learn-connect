
## План: Синхронизация данных мессенджеров для преподавателей

### Обзор
Добавить синхронизацию данных мессенджеров (MAX, WhatsApp) в соответствующие вебхуки, чтобы при общении с клиентом, связанным с преподавателем, данные автоматически обновлялись в таблице `teachers`.

### Текущее состояние
- Telegram webhook уже обновлен и синхронизирует `phone` и `telegram_user_id`
- Таблица `teachers` уже содержит колонки: `telegram_user_id`, `whatsapp_id`, `max_user_id`

### Задачи

#### 1. Обновить max-webhook/index.ts
Добавить функцию `syncTeacherFromClient` для синхронизации:
- `phone` - если у преподавателя нет телефона
- `max_user_id` - извлекается из chatId (формат: `79999999999@c.us`)
- `max_chat_id` - полный идентификатор чата

Вызов функции после обработки входящего сообщения:
```text
await syncTeacherFromClient(supabase, client.id, {
  phone: senderPhoneNumber,
  maxUserId: extractPhoneFromChatId(chatId),
  maxChatId: chatId
});
```

#### 2. Обновить whatsapp-webhook/index.ts (Green API)
Добавить аналогичную функцию для синхронизации:
- `phone`
- `whatsapp_id` - извлекается из chatId

#### 3. Обновить wappi-whatsapp-webhook/index.ts (Wappi)
Добавить синхронизацию:
- `phone`
- `whatsapp_id`

### Логика синхронизации
```text
1. При получении входящего сообщения
2. Проверить наличие связи client_id -> teacher_id в teacher_client_links
3. Если связь есть - обновить данные преподавателя
4. Обновлять только пустые поля (не перезаписывать существующие)
```

### Технические детали

**Общая функция syncTeacherFromClient:**
```text
async function syncTeacherFromClient(
  supabase: any,
  clientId: string,
  data: {
    phone?: string | null;
    whatsappId?: string | null;
    maxUserId?: string | null;
    maxChatId?: string | null;
  }
): Promise<void> {
  // 1. Найти связь с преподавателем
  const { data: teacherLink } = await supabase
    .from('teacher_client_links')
    .select('teacher_id')
    .eq('client_id', clientId)
    .maybeSingle();

  if (!teacherLink) return;

  // 2. Получить текущие данные преподавателя
  const { data: teacher } = await supabase
    .from('teachers')
    .select('phone, whatsapp_id, max_user_id')
    .eq('id', teacherLink.teacher_id)
    .single();

  // 3. Обновить только пустые поля
  const updateData = {};
  if (data.phone && !teacher.phone) updateData.phone = formatPhone(data.phone);
  if (data.whatsappId && !teacher.whatsapp_id) updateData.whatsapp_id = data.whatsappId;
  if (data.maxUserId && !teacher.max_user_id) updateData.max_user_id = data.maxUserId;

  // 4. Сохранить
  if (Object.keys(updateData).length > 0) {
    await supabase.from('teachers').update(updateData).eq('id', teacherLink.teacher_id);
  }
}
```

### Файлы для изменения
1. `supabase/functions/max-webhook/index.ts` - добавить syncTeacherFromClient и вызов в handleIncomingMessage
2. `supabase/functions/whatsapp-webhook/index.ts` - добавить syncTeacherFromClient и вызов
3. `supabase/functions/wappi-whatsapp-webhook/index.ts` - добавить syncTeacherFromClient и вызов

### Результат
После реализации, когда преподаватель пишет в любой мессенджер (Telegram, WhatsApp, MAX), его контактные данные будут автоматически синхронизироваться с карточкой преподавателя.
