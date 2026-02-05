
## Исправление wpp-webhook для совместимости с self-hosted схемой

### Проблема
Self-hosted база данных НЕ имеет колонок `whatsapp_id` и `whatsapp_chat_id` в таблице `clients`. При попытке создать или обновить клиента с этими полями возникает ошибка `PGRST204`.

### Решение
Обновить `supabase/functions/wpp-webhook/index.ts` чтобы:

1. **Поиск клиента** - искать только по `phone` (строка ~315-319)
2. **Создание клиента** - не указывать `whatsapp_id`, `whatsapp_chat_id` (строки ~328-335)
3. **Обновление клиента** - убрать `whatsapp_id`, `whatsapp_chat_id` (строки ~375-381)
4. **SELECT клиента** - убрать эти поля из выборки (строка ~315)

### Изменения в коде

**Файл:** `supabase/functions/wpp-webhook/index.ts`

**Строки 313-319 (поиск клиента):**
```typescript
// До:
let { data: client } = await supabase
  .from('clients')
  .select('id, organization_id, name, phone, whatsapp_id, whatsapp_chat_id')
  .eq('organization_id', organizationId)
  .eq('is_active', true)
  .or(`phone.eq.${phone},whatsapp_id.eq.${phone},whatsapp_chat_id.eq.${whatsappChatId}`)
  .maybeSingle()

// После:
let { data: client } = await supabase
  .from('clients')
  .select('id, organization_id, name, phone')
  .eq('organization_id', organizationId)
  .eq('is_active', true)
  .ilike('phone', `%${phone.slice(-10)}`)  // Поиск по последним 10 цифрам
  .maybeSingle()
```

**Строки 326-337 (создание клиента):**
```typescript
// До:
const { data: newClient, error: createError } = await supabase
  .from('clients')
  .insert({
    organization_id: organizationId,
    name: phone,
    phone: phone,
    whatsapp_id: phone,
    whatsapp_chat_id: whatsappChatId,
    is_active: true,
  })

// После:
const { data: newClient, error: createError } = await supabase
  .from('clients')
  .insert({
    organization_id: organizationId,
    name: phone,
    phone: phone,
    is_active: true,
  })
```

**Строки 375-386 (обновление клиента):**
```typescript
// До:
const { error: updateError } = await supabase
  .from('clients')
  .update({ 
    last_message_at: new Date().toISOString(),
    whatsapp_id: phone,
    whatsapp_chat_id: whatsappChatId,
  })
  .eq('id', client.id)

// После:
const { error: updateError } = await supabase
  .from('clients')
  .update({ 
    last_message_at: new Date().toISOString(),
  })
  .eq('id', client.id)
```

**Также обновить строки 343-348 (поиск при unique constraint):**
```typescript
// До:
.or(`phone.eq.${phone},whatsapp_id.eq.${phone}`)

// После:
.ilike('phone', `%${phone.slice(-10)}`)
```

**Обновить VERSION на `v2.5.2`**

### После деплоя
```bash
rsync -avz ./supabase/functions/ \
  automation@api.academyos.ru:/home/automation/supabase-project/volumes/functions/

docker compose restart functions

docker compose logs functions | grep wpp-webhook | tail -15
```

### Ожидаемый результат
```
[wpp-webhook][v2.5.2] Event type: chat Account: 0000000000009
[wpp-webhook] Searching for client with org: ... phone: 79852615056
[wpp-webhook] Client search result: not found
[wpp-webhook] Creating new client for: 79852615056
[wpp-webhook] New client created: <uuid>
[wpp-webhook] ✅ Message saved: <uuid> for client: <uuid>
```
