
# План исправления формата Webhook URL для Telegram Wappi

## Проблема

При создании новой интеграции Telegram (Wappi) показывается неправильный webhook URL:
- **Сейчас**: `https://api.academyos.ru/functions/v1/telegram-webhook/0e4e9f4f5e255af5549c1a3c01dc8c96`
- **Нужно**: `https://api.academyos.ru/functions/v1/telegram-webhook?profile_id=ВАШ_PROFILE_ID`

## Причина

В хуке `useMessengerIntegrations.ts` функция `getWebhookUrl` для Telegram с провайдером `wappi` не обрабатывается отдельно и попадает в fallback ветку с форматом пути (`/${messenger_type}-webhook/${webhook_key}`).

## Решение

Исправить генерацию webhook URL в двух местах:

1. **Frontend**: `useMessengerIntegrations.ts` — добавить обработку провайдера `wappi` для Telegram
2. **Backend**: `messenger-integrations/index.ts` — при создании/обновлении интеграции Wappi автоматически регистрировать webhook в Wappi API

## Изменения в файлах

### 1. `src/hooks/useMessengerIntegrations.ts`

Обновить функцию `getWebhookUrl`:

```typescript
const getWebhookUrl = useCallback((integration: MessengerIntegration) => {
  const baseUrl = 'https://api.academyos.ru/functions/v1';
  
  // For GreenAPI WhatsApp, use query param format
  if (integration.messenger_type === 'whatsapp' && integration.provider === 'green_api') {
    return `${baseUrl}/whatsapp-webhook?key=${integration.webhook_key}`;
  }
  
  // For telegram_crm provider
  if (integration.provider === 'telegram_crm') {
    return `${baseUrl}/telegram-crm-webhook?key=${integration.webhook_key}`;
  }
  
  // NEW: For Telegram Wappi provider, use profile_id from settings
  if (integration.messenger_type === 'telegram' && integration.provider === 'wappi') {
    const profileId = integration.settings?.profileId;
    if (profileId) {
      return `${baseUrl}/telegram-webhook?profile_id=${profileId}`;
    }
    // Fallback if no profile_id yet
    return `${baseUrl}/telegram-webhook`;
  }
  
  // Default: path format for WPP and other providers
  return `${baseUrl}/${integration.messenger_type}-webhook/${integration.webhook_key}`;
}, []);
```

### 2. `supabase/functions/messenger-integrations/index.ts`

При POST (создание) и PUT (обновление) интеграции Wappi Telegram автоматически регистрировать webhook:

```typescript
// После успешного создания/обновления интеграции Wappi
if (integration.messenger_type === 'telegram' && integration.provider === 'wappi') {
  const profileId = integration.settings?.profileId;
  const apiToken = integration.settings?.apiToken;
  
  if (profileId && apiToken) {
    const baseUrl = Deno.env.get('SELF_HOSTED_URL') || supabaseUrl;
    const webhookUrl = `${baseUrl}/functions/v1/telegram-webhook?profile_id=${profileId}`;
    
    const webhookResult = await registerWappiWebhook(profileId, webhookUrl, apiToken);
    console.log('[messenger-integrations] Wappi webhook registration:', webhookResult);
  }
}
```

Добавить функцию регистрации webhook:

```typescript
async function registerWappiWebhook(
  profileId: string,
  webhookUrl: string,
  apiToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Handle masked token (cannot call API with masked value)
    if (apiToken.startsWith('••')) {
      console.log('[messenger-integrations] Skipping webhook registration - token is masked');
      return { success: true };
    }
    
    const response = await fetch(
      `https://wappi.pro/tapi/webhook/url/set?profile_id=${profileId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': apiToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ webhook_url: webhookUrl })
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${JSON.stringify(data)}` };
    }
    
    return { success: true };
  } catch (error) {
    console.error('[messenger-integrations] Wappi webhook registration failed:', error);
    return { success: false, error: error.message };
  }
}
```

## Технические детали

```text
Текущий flow:
┌───────────────────────────────────────────────────────────────────┐
│ Пользователь создаёт интеграцию Telegram Wappi                     │
│ ↓                                                                 │
│ messenger-integrations POST                                        │
│ ↓                                                                 │
│ Сохранение в БД с webhook_key (UUID)                              │
│ ↓                                                                 │
│ getWebhookUrl() возвращает /telegram-webhook/<webhook_key>        │
│ ← НЕПРАВИЛЬНО! Wappi не понимает этот формат                      │
└───────────────────────────────────────────────────────────────────┘

Новый flow:
┌───────────────────────────────────────────────────────────────────┐
│ Пользователь создаёт интеграцию Telegram Wappi                     │
│ ↓                                                                 │
│ messenger-integrations POST                                        │
│ ↓                                                                 │
│ Сохранение в БД                                                   │
│ ↓                                                                 │
│ Автоматическая регистрация webhook в Wappi API                    │
│ (URL: /telegram-webhook?profile_id=XXX)                           │
│ ↓                                                                 │
│ getWebhookUrl() возвращает /telegram-webhook?profile_id=XXX       │
│ ← ПРАВИЛЬНО! Wappi отправляет вебхуки на этот адрес              │
└───────────────────────────────────────────────────────────────────┘
```

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `src/hooks/useMessengerIntegrations.ts` | Добавить обработку `wappi` провайдера в `getWebhookUrl()` — формат `?profile_id=XXX` |
| `supabase/functions/messenger-integrations/index.ts` | Добавить авто-регистрацию webhook в Wappi API при создании/обновлении интеграции |

## Важно

1. После внесения изменений нужно задеплоить Edge Function на self-hosted сервер
2. **Пересоздать или пересохранить** существующую интеграцию Telegram Wappi — это запустит авторегистрацию webhook
3. Проверить в логах Wappi, что webhook зарегистрирован корректно
