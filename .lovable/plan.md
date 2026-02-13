
# Исправление тестовой отправки Telegram BOT

## Проблема

При тестовой отправке сообщение уходит не через выбранного бота, а через основную (primary) интеграцию. Это происходит потому что функция `telegram-send` использует "умную маршрутизацию" — ищет последнее входящее сообщение от получателя и выбирает ту интеграцию, через которую оно пришло. Если таких сообщений нет — берёт primary интеграцию. Переданный `profileId` используется только для API-ключей, но не для выбора интеграции.

## Решение

Передавать `integrationId` конкретного бота в запрос `telegram-send`, чтобы функция использовала именно эту интеграцию вместо умной маршрутизации.

## Технические изменения

### 1. `src/components/admin/integrations/TelegramIntegrations.tsx`

Добавить `integrationId: integration.id` в payload тестовой отправки:

```typescript
const payload = {
  text: 'Тестовое сообщение от CRM',
  profileId,
  integrationId: integration.id, // Принудительно указываем интеграцию
  testMode: true,
  // + telegramUserId или phoneNumber
};
```

### 2. `supabase/functions/telegram-send/index.ts`

Добавить приоритетную обработку `integrationId` из тела запроса — если он передан, пропускать умную маршрутизацию и использовать указанную интеграцию напрямую:

```typescript
// Перед блоком smart routing (строка ~64):
if (body.integrationId) {
  resolvedIntegrationId = body.integrationId;
  console.log('[telegram-send] Forced integration from body:', resolvedIntegrationId);
}
```

Это позволит тестовой отправке и другим сценариям явно указывать через какую интеграцию отправлять.
