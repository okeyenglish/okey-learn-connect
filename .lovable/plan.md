

## Исправление: Edge Functions не сохраняют sender_name в metadata

### Проблема

Фронтенд уже умеет читать `metadata.sender_name` как фоллбэк, но edge functions записывают имя только в колонку `sender_name`, которой нет в self-hosted базе. Данные теряются.

### Что будет сделано

Обновить 4 edge functions, добавив `sender_name` в объект `metadata` при вставке сообщения в БД.

### Файлы для изменения

**1. `supabase/functions/wpp-send/index.ts`**
- В объекте вставки сообщения (строка ~250-263) добавить поле `metadata` с `sender_name`
- Если `metadata` уже используется, мержить с существующими данными

**2. `supabase/functions/telegram-send/index.ts`**
- В месте вставки сообщения добавить `metadata: { sender_name: body.senderName || null }`

**3. `supabase/functions/max-send/index.ts`**
- Аналогично добавить `metadata: { sender_name: body.senderName || null }`

**4. `supabase/functions/telegram-crm-send/index.ts`**
- Аналогично добавить `metadata: { sender_name: body.senderName || null }`

### Логика изменения (одинаковая для всех)

В каждой функции, в месте где формируется объект для вставки в `chat_messages`, добавить:

```typescript
metadata: {
  ...(existingMetadata || {}),
  sender_name: payload.senderName || body.senderName || null
}
```

Если в объекте вставки уже есть поле `metadata` (например, с `integration_id`), нужно мержить, а не перезаписывать.

### Результат

- Новые сообщения будут сохранять имя менеджера в `metadata.sender_name`
- Фронтенд уже читает это поле через фоллбэк-цепочку
- Старые сообщения останутся с "Менеджер поддержки" -- это ожидаемо
