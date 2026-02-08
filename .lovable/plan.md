
# План: Добавление поддержки GreenAPI в messenger_integrations

## ✅ ПОЛНОСТЬЮ ВЫПОЛНЕНО

### Изменения внесены:

1. **`supabase/functions/whatsapp-send/index.ts`** ✅
   - Добавлена функция `getGreenApiSettings()` с двухуровневым поиском
   - Приоритет: `is_primary=true` → первый по `created_at` → fallback на `messenger_settings`
   - Поддержка `integrationId` для явного выбора аккаунта

2. **`supabase/functions/whatsapp-webhook/index.ts`** ✅
   - Добавлена функция `resolveOrganizationByWebhookKey()`:
     - Извлекает `webhook_key` из URL query `?key=xxx` или path `/{key}`
     - Ищет интеграцию в `messenger_integrations` по `webhook_key`
   - Добавлена обработка не-POST запросов (GET health checks)
   - Добавлена обработка невалидного JSON
   - Улучшено логирование

3. **`src/hooks/useMessengerIntegrations.ts`** ✅
   - Изменён формат webhook URL для GreenAPI WhatsApp:
     - **Было:** `/whatsapp-webhook/{key}`
     - **Стало:** `/whatsapp-webhook?key={key}`

### Формат Webhook URL

| Provider | Формат URL |
|----------|------------|
| GreenAPI WhatsApp | `https://api.academyos.ru/functions/v1/whatsapp-webhook?key={webhook_key}` |
| Telegram CRM | `https://api.academyos.ru/functions/v1/telegram-crm-webhook?key={webhook_key}` |
| WPP Connect | `https://api.academyos.ru/functions/v1/whatsapp-webhook/{webhook_key}` |

### Порядок резолва организации в webhook

1. **webhook_key из URL** (`?key=xxx` или path) → ищем в `messenger_integrations`
2. **instanceId из тела** → ищем в `messenger_integrations` по `settings.instanceId`
3. **Fallback** → ищем в `messenger_settings` (legacy)

## Синхронизация на self-hosted

После commit/push скопируйте обновлённые файлы:
```bash
# На сервере api.academyos.ru:
docker compose restart functions
```

**Важно:** После обновления webhook URL в админке — скопируйте новый URL и обновите его в консоли GreenAPI!

## Ожидаемый результат

| Сценарий | Статус |
|----------|--------|
| Отправка с GreenAPI из messenger_integrations | ✅ |
| Приём webhooks по `?key=xxx` | ✅ |
| Приём webhooks по instanceId (fallback) | ✅ |
| Обратная совместимость | ✅ |
| Несколько аккаунтов | ✅ |
