
# План: Добавление поддержки GreenAPI в messenger_integrations

## ✅ ВЫПОЛНЕНО

### Изменения внесены:

1. **`supabase/functions/whatsapp-send/index.ts`** ✅
   - Добавлена функция `getGreenApiSettings()` с двухуровневым поиском:
     1. Сначала ищет в `messenger_integrations` (provider = 'green_api', is_enabled = true)
     2. Приоритет: `is_primary=true` → первый по `created_at`
     3. Fallback на `messenger_settings` если ничего не найдено
   - Поддержка `integrationId` в запросе для явного выбора аккаунта
   - Возвращает `source` и `integrationId` в ответе для отладки

2. **`supabase/functions/whatsapp-webhook/index.ts`** ✅
   - Добавлена функция `resolveOrganizationByWebhookKey()`:
     - PRIORITY 1: Извлекает `webhook_key` из URL path (`/whatsapp-webhook/{key}`)
     - Или из query параметра (`?key=xxx`)
     - Ищет интеграцию в `messenger_integrations` по `webhook_key`
   - PRIORITY 2: Fallback на поиск по `instanceId` в теле webhook
   - Изменена функция `resolveOrganizationIdFromWebhook()`:
     - Сначала ищет в `messenger_integrations` по instanceId
     - Затем fallback на `messenger_settings` (legacy)
   - Улучшено логирование с префиксами `[whatsapp-webhook]`

### Формат Webhook URL

Для GreenAPI интеграций используется path-based формат:
```
https://api.academyos.ru/functions/v1/whatsapp-webhook/{webhook_key}
```

Пример: `https://api.academyos.ru/functions/v1/whatsapp-webhook/9fd5bb0a9582a969daf0816316a4c743`

### Порядок резолва организации в webhook

1. **webhook_key из URL** → ищем в `messenger_integrations` по `webhook_key`
2. **instanceId из тела** → ищем в `messenger_integrations` по `settings.instanceId`
3. **Fallback** → ищем в `messenger_settings` (legacy)

## Синхронизация на self-hosted

После деплоя через GitHub Actions скопируйте файлы:
- `supabase/functions/whatsapp-send/index.ts`
- `supabase/functions/whatsapp-webhook/index.ts`

На сервере `api.academyos.ru`:
```bash
docker compose restart functions
```

## Ожидаемый результат

| Сценарий | До | После |
|----------|-----|--------|
| Отправка с GreenAPI из messenger_integrations | ❌ Не находит настройки | ✅ Работает |
| Приём webhooks по webhook_key | ❌ Не поддерживалось | ✅ Работает |
| Приём webhooks по instanceId | ❌ Только messenger_settings | ✅ Ищет в обеих таблицах |
| Обратная совместимость | - | ✅ Fallback на messenger_settings |
| Несколько аккаунтов | ❌ | ✅ is_primary выбирается первым |
