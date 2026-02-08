
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
   - Изменена функция `resolveOrganizationIdFromWebhook()`:
     1. PRIORITY 1: Ищет в `messenger_integrations` по instanceId в settings
     2. PRIORITY 2: Fallback на `messenger_settings` (legacy)
   - Улучшено логирование с префиксами `[whatsapp-webhook]`

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
| Приём webhooks | ❌ Не находит organization | ✅ Работает |
| Обратная совместимость | - | ✅ Fallback на messenger_settings |
| Несколько аккаунтов | ❌ | ✅ is_primary выбирается первым |
