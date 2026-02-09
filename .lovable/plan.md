
# Fix: Wappi Telegram — долгое сохранение и дублирование интеграций

## Обнаруженные проблемы

### 1. Двойная регистрация webhook (причина зависания)
При сохранении Wappi Telegram интеграции происходит **двойной** вызов к Wappi API:
- Сначала edge-функция `messenger-integrations` (self-hosted) вызывает `registerWappiTelegramWebhook` внутри себя (строки 156-169)
- Затем клиентский код `IntegrationEditDialog.tsx` (строки 121-159) вызывает `supabase.functions.invoke('wappi-telegram-webhook-register')` — это отдельная edge-функция

Второй вызов идёт через `supabase` клиент, который указывает на self-hosted сервер. Если эта функция там не развёрнута или медленно отвечает — диалог зависает на "Сохранение..."

### 2. Дублирование интеграций
`selfHostedPost` имеет retry-логику по умолчанию (3 попытки с backoff). Если первый запрос создаёт интеграцию, но Wappi webhook-регистрация внутри edge-функции занимает слишком долго и вызывает таймаут — retry создаёт **новую копию** интеграции.

### 3. Блокирующий вызов Wappi API в edge-функции
Вызов `registerWappiTelegramWebhook` внутри `messenger-integrations` выполняется **синхронно** перед отправкой ответа. Если Wappi API медленно отвечает — весь запрос на создание интеграции таймаутит.

## Решение

### Изменение 1: Убрать дублирующую регистрацию webhook из клиента
**Файл**: `src/components/admin/integrations/IntegrationEditDialog.tsx`

Удалить блок кода (строки 121-159) который вызывает `supabase.functions.invoke('wappi-telegram-webhook-register')`. Edge-функция `messenger-integrations` уже делает это сама.

### Изменение 2: Сделать webhook-регистрацию неблокирующей в edge-функции
**Файл**: `supabase/functions/messenger-integrations/index.ts`

Заменить `await registerWappiTelegramWebhook(...)` на fire-and-forget вызов. Интеграция создаётся и возвращается клиенту немедленно, а webhook регистрируется в фоне.

Было:
```typescript
const webhookResult = await registerWappiTelegramWebhook(profileId, webhookUrl, apiToken);
```

Станет:
```typescript
// Fire-and-forget: don't block response
registerWappiTelegramWebhook(profileId, webhookUrl, apiToken)
  .then(r => console.log('[messenger-integrations] Wappi webhook:', r))
  .catch(e => console.error('[messenger-integrations] Wappi webhook error:', e));
```

### Изменение 3: Отключить retry для создания интеграций
**Файл**: `src/hooks/useMessengerIntegrations.ts`

Добавить `retry: { noRetry: true }` в `selfHostedPost` при создании интеграции, чтобы предотвратить дублирование при retry.

## Ожидаемый результат

- Сохранение Wappi Telegram интеграции занимает 1-2 секунды (вместо 10-30+)
- Webhook регистрируется в фоне автоматически
- Дубликаты интеграций больше не создаются
- Удалён import `supabase` из `IntegrationEditDialog.tsx` (больше не нужен)
