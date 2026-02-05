
## Исправление: NOT NULL constraint на message_type

### Диагностика из логов
```
Full insert failed: Could not find the 'sender_id' column
Minimal insert failed: null value in column "message_type" violates not-null constraint
```

### Корневая причина
1. Колонка `sender_id` **не существует** на self-hosted - нужно убрать
2. Колонка `message_type` имеет **NOT NULL constraint** - нужно добавить в минимальный insert

### Изменения в `supabase/functions/wpp-send/index.ts`

**Строки 209-224** - убрать `sender_id`:
```typescript
// First attempt with all columns (self-hosted schema)
// Note: sender_id removed - column doesn't exist on self-hosted
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
}
```

**Строки 235-243** - добавить `message_type`:
```typescript
// Fallback: minimal columns only
// Note: message_type is NOT NULL on self-hosted, must include it
const minimalInsert = {
  client_id: clientId,
  organization_id: orgId,
  message_text: messageText,
  is_outgoing: true,
  message_type: 'manager',
  is_read: true,
  external_message_id: wppResult.taskId || null,
}
```

### После деплоя
```bash
docker compose restart functions
docker compose logs functions --tail 20 | grep wpp-send
```

### Ожидаемый результат
- Сообщения будут успешно сохраняться в БД
- Лог покажет: `[wpp-send] Message saved, id: xxx`
