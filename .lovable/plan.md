
# Исправление Smart Routing для преподавателей в Telegram

## Суть проблемы

При отправке сообщения **преподавателю** система не использует smart routing — она всегда выбирает `is_primary=true` интеграцию вместо той, откуда преподаватель написал.

## Диагноз

Код `telegram-send` (строки 61-79) ищет `integration_id` **только по `client_id`**:

```typescript
if (clientId) {  // <-- Для преподавателей clientId = '' (пустая строка)
  const { data: lastMessage } = await supabase
    .from('chat_messages')
    .select('integration_id')
    .eq('client_id', clientId)  // <-- Никогда не найдёт для teacher
```

Для преподавателей передаётся:
- `clientId: ''` (пустая строка)
- `phoneNumber: '+7 (985) 261-50-56'`
- `teacherId: 'xxxx-xxxx-xxxx'`

Но webhook **уже сохраняет `integration_id`** для сообщений преподавателей (строки 425-428 в `telegram-webhook`):
```typescript
if (integrationId) {
  fullPayload.integration_id = integrationId;
}
```

Проблема в том, что при отправке ответа `telegram-send` не ищет по `teacher_id`.

## Решение

Добавить в `telegram-send` поиск `integration_id` по `teacher_id`, если `clientId` пустой:

```typescript
// === SMART ROUTING: Find integration_id from last incoming message ===
let resolvedIntegrationId: string | null = null;

// Mode 1: Search by clientId (for client messages)
if (clientId) {
  const { data: lastMessage } = await supabase
    .from('chat_messages')
    .select('integration_id')
    .eq('client_id', clientId)
    .eq('is_outgoing', false)
    .eq('messenger_type', 'telegram')
    .not('integration_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastMessage?.integration_id) {
    resolvedIntegrationId = lastMessage.integration_id;
    console.log('[telegram-send] Smart routing (client): ', resolvedIntegrationId);
  }
}

// Mode 2: Search by teacherId (for teacher messages)
if (!resolvedIntegrationId && teacherId) {
  const { data: lastTeacherMessage } = await supabase
    .from('chat_messages')
    .select('integration_id')
    .eq('teacher_id', teacherId)
    .eq('is_outgoing', false)
    .eq('messenger_type', 'telegram')
    .not('integration_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastTeacherMessage?.integration_id) {
    resolvedIntegrationId = lastTeacherMessage.integration_id;
    console.log('[telegram-send] Smart routing (teacher): ', resolvedIntegrationId);
  }
}

// Mode 3: Search by phone (fallback for new contacts)
if (!resolvedIntegrationId && phoneNumber) {
  // Normalize phone
  const phone10 = phoneNumber.replace(/\D/g, '').slice(-10);
  
  // Find teacher by phone if teacherId not provided
  if (!teacherId && phone10.length === 10) {
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .ilike('phone', `%${phone10}`)
      .eq('organization_id', organizationId)
      .maybeSingle();
    
    if (teacher?.id) {
      // Search by found teacher_id
      const { data: msg } = await supabase
        .from('chat_messages')
        .select('integration_id')
        .eq('teacher_id', teacher.id)
        .eq('is_outgoing', false)
        .eq('messenger_type', 'telegram')
        .not('integration_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (msg?.integration_id) {
        resolvedIntegrationId = msg.integration_id;
        console.log('[telegram-send] Smart routing (phone->teacher): ', resolvedIntegrationId);
      }
    }
  }
}
```

## Файл для изменения

| Файл | Изменения |
|------|-----------|
| `supabase/functions/telegram-send/index.ts` | Добавить поиск `integration_id` по `teacher_id` когда `clientId` пустой |

## Ожидаемый результат

После исправления:
1. Преподаватель пишет в Telegram на определённый аккаунт организации
2. Webhook сохраняет `integration_id` в `chat_messages` (уже работает)
3. При ответе менеджера `telegram-send` ищет `integration_id` **по `teacher_id`**
4. Ответ уходит с того же аккаунта, откуда преподаватель написал
5. Сообщение успешно доставляется (зелёная галочка вместо красной)
