

## Исправление ошибки `.catch()` в wpp-webhook

### Проблема
Строка 88: `.catch()` нельзя использовать на Supabase query builder — это не Promise.

### Решение

**Файл:** `supabase/functions/wpp-webhook/index.ts`

**Было (строки 79-88):**
```typescript
// Log webhook event
await supabase
  .from('webhook_logs')
  .insert({
    messenger_type: 'whatsapp',
    event_type: eventType,
    webhook_data: event,
    processed: false
  })
  .catch(e => console.warn('[wpp-webhook] Failed to log event:', e))
```

**Станет:**
```typescript
// Log webhook event (fire-and-forget)
supabase
  .from('webhook_logs')
  .insert({
    messenger_type: 'whatsapp',
    event_type: eventType,
    webhook_data: event,
    processed: false
  })
  .then(({ error }) => {
    if (error) console.warn('[wpp-webhook] Failed to log event:', error)
  })
```

**Дополнительно:** Обновить версию на `v2.4.1` (строка 10).

### После деплоя
Проверить на self-hosted:
```bash
curl -X POST https://api.academyos.ru/functions/v1/wpp-webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"test","data":{}}'
```
Ожидаемый ответ: `{"ok":true,"_version":"v2.4.1"}`

