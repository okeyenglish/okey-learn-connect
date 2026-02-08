
# План исправления удаления и редактирования сообщений через GreenAPI и Wappi

## Выявленные проблемы

### Проблема 1: GreenAPI функции используют устаревший подход

**Функции `delete-whatsapp-message` и `edit-whatsapp-message`** читают учётные данные из переменных окружения:

```typescript
const greenApiUrl = Deno.env.get('GREEN_API_URL')
const greenApiToken = Deno.env.get('GREEN_API_TOKEN_INSTANCE')
const greenApiInstance = Deno.env.get('GREEN_API_ID_INSTANCE')
```

Это устаревший подход. На self-hosted сервере эти переменные не установлены, поэтому функции возвращают "Green API not configured".

### Проблема 2: Wappi функции ищут настройки в неправильной таблице

**Функции `wappi-whatsapp-delete` и `wappi-whatsapp-edit`** ищут настройки в таблице `messenger_settings`:

```typescript
const { data: settings } = await supabase
  .from('messenger_settings')  // ← Неправильная таблица!
  .eq('messenger_type', 'whatsapp')
  .eq('provider', 'wappi')
```

На self-hosted сервере настройки хранятся в таблице `messenger_integrations`.

### Проблема 3: Не определяется organization_id правильно

Функции GreenAPI не получают `organization_id` из сообщения, поэтому не могут найти настройки интеграции.

---

## План исправлений

### Шаг 1: Переписать `delete-whatsapp-message` для использования `messenger_integrations`

Изменения:
- Получать `organization_id` из записи сообщения в `chat_messages`
- Искать настройки GreenAPI в `messenger_integrations` (приоритет) и `messenger_settings` (fallback)
- Использовать правильный фильтр: `provider = 'green_api'` и `is_enabled = true`
- Удалить зависимость от переменных окружения `GREEN_API_*`

### Шаг 2: Переписать `edit-whatsapp-message` аналогично

Те же изменения, что и для delete функции.

### Шаг 3: Обновить `wappi-whatsapp-delete` для поддержки `messenger_integrations`

Изменения:
- Добавить поиск в `messenger_integrations` как приоритетный источник
- Сохранить fallback к `messenger_settings` для совместимости

### Шаг 4: Обновить `wappi-whatsapp-edit` аналогично

Те же изменения.

---

## Технические детали

### Логика получения настроек GreenAPI (аналогично `whatsapp-send`)

```typescript
async function getGreenApiSettings(supabase, organizationId) {
  // 1. Сначала ищем в messenger_integrations
  const { data: integration } = await supabase
    .from('messenger_integrations')
    .select('id, settings, is_primary')
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'whatsapp')
    .eq('provider', 'green_api')
    .eq('is_enabled', true)
    .order('is_primary', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (integration?.settings) {
    const settings = integration.settings;
    return {
      instanceId: settings.instanceId,
      apiToken: settings.apiToken,
      apiUrl: settings.apiUrl || 'https://api.green-api.com',
    };
  }

  // 2. Fallback к messenger_settings
  const { data: legacySettings } = await supabase
    .from('messenger_settings')
    .select('settings, is_enabled')
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'whatsapp')
    .maybeSingle();

  if (legacySettings?.is_enabled && legacySettings?.settings) {
    return {
      instanceId: legacySettings.settings.instanceId,
      apiToken: legacySettings.settings.apiToken,
      apiUrl: legacySettings.settings.apiUrl || 'https://api.green-api.com',
    };
  }

  return null;
}
```

### Логика получения настроек Wappi

```typescript
async function getWappiSettings(supabase, organizationId) {
  // 1. Сначала ищем в messenger_integrations
  const { data: integration } = await supabase
    .from('messenger_integrations')
    .select('id, settings')
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'whatsapp')
    .eq('provider', 'wappi')
    .eq('is_enabled', true)
    .order('is_primary', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (integration?.settings) {
    return {
      profileId: integration.settings.wappiProfileId,
      apiToken: integration.settings.wappiApiToken,
    };
  }

  // 2. Fallback к messenger_settings
  const { data: legacySettings } = await supabase
    .from('messenger_settings')
    .select('settings')
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'whatsapp')
    .eq('provider', 'wappi')
    .eq('is_enabled', true)
    .maybeSingle();

  if (legacySettings?.settings) {
    return {
      profileId: legacySettings.settings.wappiProfileId,
      apiToken: legacySettings.settings.wappiApiToken,
    };
  }

  return null;
}
```

---

## Файлы для изменения

| Файл | Изменения |
|------|-----------|
| `supabase/functions/delete-whatsapp-message/index.ts` | Полная переработка: получение org_id из сообщения, поиск настроек в messenger_integrations |
| `supabase/functions/edit-whatsapp-message/index.ts` | Полная переработка аналогично delete |
| `supabase/functions/wappi-whatsapp-delete/index.ts` | Добавить приоритетный поиск в messenger_integrations |
| `supabase/functions/wappi-whatsapp-edit/index.ts` | Добавить приоритетный поиск в messenger_integrations |

---

## Действия после деплоя

1. Синхронизировать Edge Functions на self-hosted сервере
2. Перезапустить контейнер: `docker compose restart functions`
3. Протестировать удаление и редактирование сообщений

---

## Ожидаемый результат

После исправлений:
- Удаление и редактирование сообщений через GreenAPI будет работать
- Удаление и редактирование сообщений через Wappi будет работать
- Функции будут использовать правильные настройки из `messenger_integrations`
