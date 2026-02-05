
## План: Исправление сохранения сообщений в БД (wpp-send)

### Проблема
Сообщение **успешно отправляется** в WhatsApp (200 OK), но падает при INSERT в `chat_messages`. Ошибка усекается в логах.

### Корневая причина
Edge function `wpp-send` использует колонки из self-hosted схемы, но некоторые могут отсутствовать:
- `message_type` (enum 'manager'/'client')
- `messenger_type` (enum 'whatsapp')
- `message_status` (enum 'sent'/'failed')
- `sender_id` (uuid)

### Решение: Resilient Insert с fallback

Применим паттерн из `useSendMessage` - если INSERT падает из-за отсутствующей колонки, повторяем без неё.

### Изменения в `supabase/functions/wpp-send/index.ts`

**Строки 205-223** - заменить на:

```typescript
// Save message to database with resilient insert
let savedMessage = null
let saveError = null

// First attempt with all columns
const fullInsert = {
  client_id: clientId,
  organization_id: orgId,
  message_text: messageText,
  is_outgoing: true,
  message_type: 'manager',
  messenger_type: 'whatsapp',
  message_status: messageStatus,
  external_message_id: wppResult.taskId || null,
  is_read: true,
  file_url: fileUrl || null,
  file_name: fileName || null,
  file_type: fileUrl ? getFileTypeFromUrl(fileUrl) : null,
  sender_id: user.id,
}

const result1 = await supabase
  .from('chat_messages')
  .insert(fullInsert)
  .select()
  .maybeSingle()

if (result1.error) {
  console.warn('[wpp-send] Full insert failed, trying minimal:', result1.error.message)
  
  // Fallback: minimal columns only
  const minimalInsert = {
    client_id: clientId,
    organization_id: orgId,
    message_text: messageText,
    is_outgoing: true,
    is_read: true,
    external_message_id: wppResult.taskId || null,
  }
  
  const result2 = await supabase
    .from('chat_messages')
    .insert(minimalInsert)
    .select()
    .maybeSingle()
  
  savedMessage = result2.data
  saveError = result2.error
} else {
  savedMessage = result1.data
}

if (saveError) {
  console.error('[wpp-send] Error saving message to database:', saveError)
} else {
  console.log('[wpp-send] Message saved, id:', savedMessage?.id)
}
```

### Альтернатива: Диагностика на сервере

Если хотите сначала понять, какая именно колонка отсутствует:

```bash
# Проверить схему chat_messages на сервере
docker compose exec db psql -U postgres -d postgres -c "\d public.chat_messages"

# Или через Supabase API
curl -X POST 'https://api.academyos.ru/rest/v1/rpc/get_table_columns' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"table_name": "chat_messages"}'
```

### Шаги реализации

1. Обновить `wpp-send/index.ts` с resilient insert
2. Скопировать файл на сервер
3. Перезапустить функции: `docker compose restart functions`
4. Протестировать отправку сообщения

### Ожидаемый результат
- Сообщения будут сохраняться в БД даже если часть колонок отсутствует
- Логи покажут, какие колонки не поддерживаются
