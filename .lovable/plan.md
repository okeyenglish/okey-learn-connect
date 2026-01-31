
# План: Обновление WhatsApp вебхуков для поддержки teacher_id

## Текущая проблема
Два из трёх WhatsApp провайдеров не обновлены для новой архитектуры `teacher_id`:
- `whatsapp-webhook` (GreenAPI) - сообщения всегда привязываются к `client_id`
- `wpp-webhook` - сообщения всегда привязываются к `client_id`

## Целевое поведение
При входящем сообщении в WhatsApp:
1. Сначала проверить `teachers.whatsapp_id` по номеру телефона
2. Если найден преподаватель - создать сообщение с `teacher_id`, без `client_id`
3. Если не найден - создать/найти клиента как обычно

## Задачи

### 1. Обновить whatsapp-webhook/index.ts (GreenAPI)

Добавить в функцию `handleIncomingMessage`:

```typescript
// PRIORITY 1: Check if sender is a TEACHER by whatsapp_id
const { data: teacherData } = await supabase
  .from('teachers')
  .select('id, first_name, last_name')
  .eq('organization_id', organizationId)
  .eq('whatsapp_id', phoneNumber)
  .eq('is_active', true)
  .maybeSingle()

if (teacherData) {
  // Save message with teacher_id (not client_id)
  const { error } = await supabase.from('chat_messages').insert({
    teacher_id: teacherData.id,
    client_id: null,
    organization_id: organizationId,
    message_text: messageText,
    message_type: 'client',
    messenger_type: 'whatsapp',
    message_status: 'delivered',
    external_message_id: idMessage,
    is_outgoing: false,
    is_read: false,
    file_url: fileUrl,
    file_name: fileName,
    file_type: fileType,
    created_at: new Date(webhook.timestamp * 1000).toISOString()
  })
  return // Exit early - don't create client
}
// PRIORITY 2: Continue with normal client flow...
```

Аналогично для `handleOutgoingMessage`.

### 2. Обновить wpp-webhook/index.ts

Добавить в функцию `handleIncomingMessage`:

```typescript
// PRIORITY 1: Check if sender is a TEACHER by whatsapp_id
const { data: teacherData } = await supabase
  .from('teachers')
  .select('id')
  .eq('organization_id', organizationId)
  .eq('whatsapp_id', phone)
  .eq('is_active', true)
  .maybeSingle()

if (teacherData) {
  await supabase.from('chat_messages').insert({
    teacher_id: teacherData.id,
    client_id: null,
    message_text: messageText,
    message_type: isFromMe ? 'manager' : 'client',
    is_read: isFromMe,
    is_outgoing: isFromMe,
    messenger_type: 'whatsapp',
    file_url: media?.url || null,
    // ...
  })
  return
}
// Continue with client flow...
```

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| supabase/functions/whatsapp-webhook/index.ts | Добавить проверку teachers перед созданием client |
| supabase/functions/wpp-webhook/index.ts | Добавить проверку teachers перед созданием client |

## Ожидаемый результат

После обновления:
- Все три WhatsApp провайдера будут корректно атрибутировать сообщения преподавателей через `teacher_id`
- Новые входящие сообщения от преподавателей сразу попадут в папку "Преподаватели"
- Не будут создаваться дубликаты клиентов для преподавателей
