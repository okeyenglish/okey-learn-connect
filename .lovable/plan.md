
# План: Добавление поддержки GreenAPI в messenger_integrations

## Проблема

При подключении GreenAPI WhatsApp через `IntegrationsList`:
1. **Сообщения НЕ уходят** — `whatsapp-send` ищет настройки только в `messenger_settings`
2. **Сообщения НЕ приходят** — `whatsapp-webhook` ищет organization_id только в `messenger_settings`

Новые интеграции сохраняются в `messenger_integrations`, но Edge Functions их не видят.

## Решение

### Файл 1: `supabase/functions/whatsapp-send/index.ts`

Добавить функцию `getGreenApiSettings()` которая:
1. Сначала ищет в `messenger_integrations` (provider = 'green_api', is_enabled = true)
2. Приоритет: `is_primary=true` → первый по `created_at`
3. Fallback на `messenger_settings` если ничего не найдено

```typescript
async function getGreenApiSettings(supabase, organizationId, integrationId?) {
  // 1. messenger_integrations (приоритет)
  let query = supabase
    .from('messenger_integrations')
    .select('id, settings, is_primary')
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'whatsapp')
    .eq('provider', 'green_api')
    .eq('is_enabled', true)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });

  // Если найдено - возвращаем instanceId, apiToken, apiUrl из settings
  
  // 2. Fallback на messenger_settings
  // ...
}
```

### Файл 2: `supabase/functions/whatsapp-webhook/index.ts`

Изменить `resolveOrganizationIdFromWebhook()`:
1. Сначала искать в `messenger_integrations` по instanceId в settings
2. Fallback на `messenger_settings`

```typescript
// PRIORITY 1: messenger_integrations
const { data: integrations } = await supabase
  .from('messenger_integrations')
  .select('organization_id, settings')
  .eq('messenger_type', 'whatsapp')
  .eq('provider', 'green_api')
  .eq('is_enabled', true);

for (const int of integrations) {
  if (String(int.settings?.instanceId) === instanceId) {
    return int.organization_id;
  }
}

// PRIORITY 2: messenger_settings (fallback)
// существующая логика
```

## Ожидаемый результат

| Сценарий | До | После |
|----------|-----|--------|
| Отправка с GreenAPI из messenger_integrations | ❌ Не находит настройки | ✅ Работает |
| Приём webhooks | ❌ Не находит organization | ✅ Работает |
| Обратная совместимость | - | ✅ Fallback на messenger_settings |
| Несколько аккаунтов | ❌ | ✅ is_primary выбирается первым |

## Технические детали

### Порядок выбора интеграции для отправки

| Условие | Какая интеграция |
|---------|------------------|
| Передан `integrationId` | Указанная интеграция |
| 1 активная интеграция | Она |
| Несколько активных | `is_primary = true` |
| Нет primary | Первая по `created_at` |
| Нет в `messenger_integrations` | Fallback на `messenger_settings` |

### Файлы для изменения

1. `supabase/functions/whatsapp-send/index.ts`
2. `supabase/functions/whatsapp-webhook/index.ts`

После деплоя через GitHub Actions на self-hosted сервер — GreenAPI интеграция заработает.
