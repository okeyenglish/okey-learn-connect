

## Исправление схемы chat_messages для WPP функций

### Проблема
Функции `wpp-send` и `wpp-webhook` используют колонки из Lovable Cloud схемы, но self-hosted база (api.academyos.ru) имеет другую структуру.

### Сравнение схем

| wpp-send/webhook (НЕПРАВИЛЬНО) | Self-hosted (ПРАВИЛЬНО) |
|--------------------------------|------------------------|
| `content` | `message_text` |
| `direction: 'outgoing'` | `is_outgoing: true` |
| `messenger: 'whatsapp'` | `messenger_type: 'whatsapp'` |
| `status` | `message_status` |
| `media_url` | `file_url` |
| `media_type` | `file_type` |
| `message_type: 'text'` | `message_type: 'manager'` / `'client'` |

---

### Изменения в `supabase/functions/wpp-send/index.ts`

**Строки 196-214** - исправить insert:

```typescript
// БЫЛО:
.insert({
  client_id: clientId,
  organization_id: orgId,
  content: messageText,           // ❌
  direction: 'outgoing',          // ❌
  message_type: fileUrl ? ... : 'text', // ❌
  messenger: 'whatsapp',          // ❌
  status: messageStatus,          // ❌
  media_url: fileUrl,             // ❌
  media_type: ...                 // ❌
})

// СТАНЕТ:
.insert({
  client_id: clientId,
  organization_id: orgId,
  message_text: messageText,      // ✅
  is_outgoing: true,              // ✅
  message_type: 'manager',        // ✅ исходящее = от менеджера
  messenger_type: 'whatsapp',     // ✅
  message_status: messageStatus,  // ✅
  is_read: true,
  file_url: fileUrl,              // ✅
  file_name: fileName,
  file_type: fileUrl ? getFileTypeFromUrl(fileUrl) : null,  // ✅
  external_message_id: wppResult.taskId,
  sender_id: user.id,
})
```

---

### Изменения в `supabase/functions/wpp-webhook/index.ts`

**Строки 239-252** (сообщение от преподавателя) - исправить insert:

```typescript
// БЫЛО:
await supabase.from('chat_messages').insert({
  teacher_id: teacherData.id,
  content: messageText,           // ❌
  direction: isFromMe ? 'outgoing' : 'incoming', // ❌
  messenger: 'whatsapp',          // ❌
  media_url: media?.url,          // ❌
  media_type: media?.mimetype,    // ❌
});

// СТАНЕТ:
await supabase.from('chat_messages').insert({
  teacher_id: teacherData.id,
  client_id: null,
  organization_id: organizationId,
  message_text: messageText,      // ✅
  message_type: isFromMe ? 'manager' : 'client', // ✅
  messenger_type: 'whatsapp',     // ✅
  is_outgoing: isFromMe,          // ✅
  is_read: isFromMe,
  file_url: media?.url || null,   // ✅
  file_name: media?.filename || null,
  file_type: media?.mimetype ? getFileTypeFromMime(media.mimetype) : null, // ✅
  external_message_id: messageId || (data as any).id || null,
});
```

**Строки 310-324** (сообщение от клиента) - аналогичные исправления:

```typescript
// СТАНЕТ:
const { error: messageError } = await supabase
  .from('chat_messages')
  .insert({
    client_id: client.id,
    organization_id: organizationId,
    message_text: messageText,      // ✅
    message_type: isFromMe ? 'manager' : 'client', // ✅
    messenger_type: 'whatsapp',     // ✅
    is_outgoing: isFromMe,          // ✅
    is_read: isFromMe,
    file_url: media?.url || null,   // ✅
    file_name: media?.filename || null,
    file_type: media?.mimetype ? getFileTypeFromMime(media.mimetype) : null, // ✅
    external_message_id: messageId || (data as any).id || null,
  });
```

---

### Результат

После исправлений:
- Отправка сообщений через WPP будет корректно сохраняться в БД
- Входящие сообщения через webhook будут правильно записываться
- Сообщения появятся в CRM интерфейсе

