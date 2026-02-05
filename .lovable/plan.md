
## Добавление регистрации webhook в wpp-create

### Проблема
Функция `wpp-create` не регистрирует webhook на WPP Platform:

| Функция | Webhook |
|---------|---------|
| `wpp-provision` | Регистрирует через `ensureAccountWithQr(sessionName, webhookUrl)` |
| `wpp-create` | Не регистрирует - вызывает только `startAccount(session)` |

Поэтому при подключении через `wpp-create` WPP Platform не знает куда отправлять входящие сообщения.

### Решение

#### Изменения в `supabase/functions/wpp-create/index.ts`

1. Добавить построение webhook URL после создания клиента
2. Вызвать `registerWebhook` или использовать `ensureAccountWithQr` вместо `startAccount`

```typescript
// Строки ~229-236: заменить startAccount на ensureAccountWithQr с webhook

// БЫЛО:
const wpp = new WppMsgClient({
  baseUrl: WPP_BASE_URL,
  apiKey: newClient.apiKey,
});

const startResult = await wpp.startAccount(newClient.session);

// СТАНЕТ:
const wpp = new WppMsgClient({
  baseUrl: WPP_BASE_URL,
  apiKey: newClient.apiKey,
});

// Build webhook URL
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const webhookUrl = `${SUPABASE_URL}/functions/v1/wpp-webhook?account=${newClient.session}`;
console.log('[wpp-create] Webhook URL:', webhookUrl);

// Start account WITH webhook registration
const startResult = await wpp.ensureAccountWithQr(newClient.session, webhookUrl, 30);
```

3. То же самое для существующих интеграций (строки ~137-139):

```typescript
// При работе с существующей интеграцией тоже регистрируем webhook
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const webhookUrl = `${SUPABASE_URL}/functions/v1/wpp-webhook?account=${settings.wppAccountNumber}`;

// Регистрируем webhook при старте
await wpp.registerWebhook(settings.wppAccountNumber, webhookUrl).catch(e => 
  console.warn('[wpp-create] Webhook registration failed:', e)
);
```

### Поток после исправления

```text
1. Lovable вызывает wpp-create
2. Создаётся сессия → session = "0000000000001"
3. Lovable вызывает POST /internal/session/0000000000001/webhook
   body: { url: "https://api.academyos.ru/functions/v1/wpp-webhook?account=0000000000001" }
4. WPP Platform сохраняет: webhooks["0000000000001"] = webhook URL
5. При входящем сообщении → WPP отправляет событие на Lovable
```

### Результат
После изменений WPP Platform будет знать куда отправлять:
- Входящие сообщения (`message.received`)
- Статусы доставки (`message.sent`, `message.delivered`)  
- События подключения (`session.connected`, `session.disconnected`)
