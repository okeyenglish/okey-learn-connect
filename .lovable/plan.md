

## План: Исправить схему колонок в wpp-send

### Проблема обнаружена
Код `wpp-send/index.ts` использует **неправильные имена колонок** для таблицы `chat_messages`. Это приводит к ошибке при сохранении сообщения в базу данных.

### Несоответствие колонок

| Текущий код | Схема сервера |
|-------------|---------------|
| `content` | `message_text` |
| `direction: 'outgoing'` | `is_outgoing: true` |
| `messenger` | `messenger_type` |
| `status` | `message_status` |
| `external_id` | `external_message_id` |
| `media_url` | `file_url` |
| `media_type` | `file_type` |
| `message_type: 'text'` | `message_type: 'manager'` |

### Изменения в коде

**Файл:** `supabase/functions/wpp-send/index.ts`  
**Строки:** 205-223

**Было:**
```typescript
const { data: savedMessage, error: saveError } = await supabase
  .from('chat_messages')
  .insert({
    client_id: clientId,
    organization_id: orgId,
    content: messageText,              // ❌ Неправильно
    direction: 'outgoing',             // ❌ Неправильно
    message_type: 'text',              // ❌ Неправильно
    messenger: 'whatsapp',             // ❌ Неправильно
    status: messageStatus,             // ❌ Неправильно
    external_id: wppResult.taskId,     // ❌ Неправильно
    is_read: true,
    media_url: fileUrl || null,        // ❌ Неправильно
    file_name: fileName || null,
    media_type: fileUrl ? ... : null,  // ❌ Неправильно
    sender_id: user.id,
  })
```

**Станет:**
```typescript
const { data: savedMessage, error: saveError } = await supabase
  .from('chat_messages')
  .insert({
    client_id: clientId,
    organization_id: orgId,
    message_text: messageText,              // ✅ Исправлено
    is_outgoing: true,                      // ✅ Исправлено
    message_type: 'manager',                // ✅ Исправлено
    messenger_type: 'whatsapp',             // ✅ Исправлено
    message_status: messageStatus,          // ✅ Исправлено
    external_message_id: wppResult.taskId || null,  // ✅ Исправлено
    is_read: true,
    file_url: fileUrl || null,              // ✅ Исправлено
    file_name: fileName || null,
    file_type: fileUrl ? ... : null,        // ✅ Исправлено
    sender_id: user.id,
  })
```

### После одобрения плана

1. Я внесу изменения в код
2. Вам нужно будет скопировать обновленный файл на сервер и перезапустить функции

### Команда для сервера (после изменений)

```bash
cd /home/automation/supabase-project

# Скопировать содержимое обновленного файла
cat > volumes/functions/wpp-send/index.ts << 'WPPEOF'
[содержимое обновлённого файла]
WPPEOF

# Перезапустить функции
docker compose restart functions
```

### Ожидаемый результат

После исправления:
- Сообщения будут корректно сохраняться в БД
- В ответе появится `savedMessageId`
- Сообщения будут отображаться в чате сразу после отправки

