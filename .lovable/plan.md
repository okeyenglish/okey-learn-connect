
# Исправление маршрутизации Telegram-сообщений: ответ на правильную интеграцию

## Суть проблемы

Клиент написал сообщение в Telegram, но при ответе система использует **не ту интеграцию** — вместо того чтобы ответить с того аккаунта, на который написал клиент, она отправляет с `is_primary=true` аккаунта. Это приводит к ошибке отправки (красный индикатор на скриншоте).

## Техническая диагностика

### Текущее состояние smart routing по функциям:

| Edge Function | Smart Routing | Статус |
|---------------|---------------|--------|
| `wpp-send` | Ищет `integration_id` из последнего входящего | ✅ Работает |
| `telegram-crm-send` | Ищет `integration_id` из последнего входящего | ✅ Работает |
| `max-send` | Ищет `integration_id` из последнего входящего | ✅ Работает |
| `whatsapp-send` | Ищет `integration_id` из последнего входящего | ✅ Работает |
| **`telegram-send` (Wappi)** | Берёт только `is_primary=true` | ❌ **Проблема!** |

### Корневые причины:

1. **`telegram-webhook`** при сохранении входящего сообщения **НЕ сохраняет `integration_id`** в `chat_messages`. Функция `resolveOrganizationByTelegramProfileId` возвращает только `organizationId`, но не `integrationId`.

2. **`telegram-send`** (строки 57-65) жёстко ищет только `is_primary=true` интеграцию:
```typescript
const { data: integration } = await supabase
  .from('messenger_integrations')
  .eq('is_primary', true)  // <-- всегда primary!
  .maybeSingle();
```

3. При делегировании в `telegram-crm-send` передаётся `integrationId: integration.id` (ID primary интеграции), что **переопределяет** smart routing там.

## План исправления

### Шаг 1: Обновить `telegram-webhook` — возвращать и сохранять `integration_id`

**Изменение 1a**: Функция `resolveOrganizationByTelegramProfileId` должна возвращать `{ organizationId, integrationId }`:

```typescript
// Было:
Promise<{ organizationId: string } | null>

// Станет:
Promise<{ organizationId: string; integrationId?: string } | null>
```

**Изменение 1b**: При нахождении интеграции в `messenger_integrations` — также возвращать её `id`:

```typescript
// Добавить в select:
.select('id, organization_id, is_enabled, settings')

// Возвращать:
return { organizationId: integration.organization_id, integrationId: integration.id };
```

**Изменение 1c**: В `handleIncomingMessage` передавать `integrationId` и сохранять его в `chat_messages`:

```typescript
// В fullPayload добавить:
integration_id: integrationId || null,
```

### Шаг 2: Обновить `telegram-send` — добавить smart routing

Добавить логику аналогичную `wpp-send` (строки 81-99):

```typescript
// После получения clientId из body, до поиска интеграции:
let resolvedIntegrationId: string | null = null;
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
    console.log('[telegram-send] Smart routing: using integration from last message:', resolvedIntegrationId);
  }
}

// Затем использовать resolvedIntegrationId при поиске интеграции
if (resolvedIntegrationId) {
  integrationQuery = integrationQuery.eq('id', resolvedIntegrationId);
} else {
  integrationQuery = integrationQuery.eq('is_primary', true);
}
```

### Шаг 3: При делегировании в `telegram-crm-send` — не передавать `integrationId` из primary

**Изменение**: Передавать `integrationId` только если он был получен через smart routing, а не жёстко из primary:

```typescript
// Было:
body: JSON.stringify({
  ...body,
  integrationId: integration.id,  // <-- всегда primary
}),

// Станет (если smart routing нашёл интеграцию):
body: JSON.stringify({
  ...body,
  integrationId: resolvedIntegrationId || undefined,  // <-- пустой = telegram-crm-send сам найдёт
}),
```

## Файлы для изменения

| Файл | Изменения |
|------|-----------|
| `supabase/functions/telegram-webhook/index.ts` | 1. Изменить `resolveOrganizationByTelegramProfileId` — возвращать `integrationId`<br>2. Передавать `integrationId` в `handleIncomingMessage`<br>3. Сохранять `integration_id` в `chat_messages` |
| `supabase/functions/telegram-send/index.ts` | 1. Добавить smart routing — поиск `integration_id` из последнего входящего<br>2. Использовать найденный ID при выборе интеграции<br>3. При делегировании в `telegram-crm-send` — не переопределять smart routing |

## Ожидаемый результат

После исправления:
1. Входящее сообщение от клиента сохраняется с `integration_id` — ID конкретной Telegram-интеграции (Wappi профиля)
2. При ответе менеджера `telegram-send` находит этот `integration_id` в последнем входящем сообщении
3. Ответ отправляется через ту же интеграцию, откуда пришло сообщение
4. Ошибка отправки исчезает — сообщение доставляется клиенту

## Примечание

Для self-hosted инстансов нужно убедиться, что в таблице `chat_messages` есть колонка `integration_id`. Если её нет — функция `resilientInsertMessage` отбросит это поле при fallback (не критично для Cloud, где колонка есть).
