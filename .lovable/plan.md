

# План: Обновление Telegram CRM интеграции согласно инструкции

## Проблема

Текущая реализация использует `project_id` в body для идентификации организации. Это:
- Небезопасно — можно подделать
- Требует от CRM сервера хранить маппинг
- Не соответствует best practices

## Изменения согласно инструкции

### 1. telegram-crm-connect — исправить endpoint и URL

**Строки 86-103:**

```typescript
// БЫЛО:
const webhookUrl = `${selfHostedUrl}/functions/v1/telegram-crm-webhook`;

const connectResponse = await fetch(`${crmApiUrl}/integration/lovable/connect`, {
  // ...
  body: JSON.stringify({
    project_id: organizationId,
    webhook_url: webhookUrl,
    phone: crmPhoneNumber,
    secret: webhookKey,
  }),
});

// СТАНЕТ:
const webhookUrl = `${selfHostedUrl}/functions/v1/telegram-crm-webhook?key=${webhookKey}`;

const connectResponse = await fetch(`${crmApiUrl}/webhook/connect`, {
  // ...
  body: JSON.stringify({
    name: 'lovable',
    webhook_url: webhookUrl,
    secret: webhookKey,  // опционально для подписи
  }),
});
```

### 2. telegram-crm-webhook — идентификация по key из URL

**Полная переработка логики идентификации (строки 55-89):**

```typescript
// БЫЛО: Ищем по project_id из body
const { project_id } = payload;
if (!project_id) {
  return error;
}
const organizationId = project_id;

// СТАНЕТ: Ищем по key из URL
const url = new URL(req.url);
const webhookKey = url.searchParams.get('key');

if (!webhookKey) {
  console.log('[telegram-crm-webhook] Missing webhook key');
  return new Response(
    JSON.stringify({ success: true, status: 'ignored', reason: 'missing_key' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Найти интеграцию по webhook_key
const { data: integration, error: integrationError } = await supabase
  .from('messenger_integrations')
  .select('organization_id, settings')
  .eq('webhook_key', webhookKey)
  .eq('messenger_type', 'telegram')
  .eq('provider', 'telegram_crm')
  .single();

if (integrationError || !integration) {
  console.error('[telegram-crm-webhook] Integration not found for key:', webhookKey);
  return new Response(
    JSON.stringify({ success: true, status: 'ignored', reason: 'invalid_key' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

const organizationId = integration.organization_id;

// Проверка X-Lovable-Secret (если настроен)
const settings = integration.settings as { secret?: string };
const expectedSecret = settings?.secret;
const incomingSecret = req.headers.get('X-Lovable-Secret');

if (expectedSecret && expectedSecret !== incomingSecret) {
  console.error('[telegram-crm-webhook] Invalid secret');
  return new Response(
    JSON.stringify({ success: true, status: 'ignored', reason: 'invalid_secret' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### 3. telegram-crm-send — убрать project_id

**Строки 185-190:**

```typescript
// БЫЛО:
const sendPayload = {
  project_id: organizationId,
  phone: crmPhoneNumber,
  to: recipient,
  text: text || '',
};

// СТАНЕТ:
const sendPayload = {
  phone: crmPhoneNumber,
  to: recipient,
  text: text || '',
};
```

### 4. Обновить интерфейс payload (webhook)

```typescript
// БЫЛО:
interface TelegramCrmWebhookPayload {
  project_id: string;       // organization_id - УБРАТЬ
  account_phone: string;
  from_id: number | string;
  // ...
}

// СТАНЕТ:
interface TelegramCrmWebhookPayload {
  account_phone: string;    // sender account phone
  from_id: number | string; // telegram user ID
  from_username?: string;   // telegram username
  text?: string;            // message text
  file_url?: string;        // file URL if any
  file_type?: string;       // file MIME type
  file_name?: string;       // file name
  message_id?: number;      // external message ID (number, не string)
  chat_id?: number;         // telegram chat ID (number, не string)
  timestamp?: string;       // message timestamp
}
```

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `supabase/functions/telegram-crm-connect/index.ts` | Endpoint + key в URL |
| `supabase/functions/telegram-crm-webhook/index.ts` | Идентификация по key |
| `supabase/functions/telegram-crm-send/index.ts` | Убрать project_id |

## Безопасность (итоговая модель)

| Уровень | Реализация |
|---------|------------|
| Идентификация | `webhook_key` в URL (UUID) |
| Отзыв доступа | Смена `webhook_key` в БД |
| Подпись | `X-Lovable-Secret` (опционально) |
| Изоляция | `organization_id` из БД, не из запроса |

## Формат запросов после изменений

### Connect (Lovable → CRM)
```http
POST https://tg.academyos.ru/webhook/connect
{
  "name": "lovable",
  "webhook_url": "https://api.academyos.ru/functions/v1/telegram-crm-webhook?key=abc-uuid",
  "secret": "shared-secret"
}
```

### Webhook (CRM → Lovable)
```http
POST https://api.academyos.ru/functions/v1/telegram-crm-webhook?key=abc-uuid
X-Lovable-Secret: shared-secret

{
  "account_phone": "79955073535",
  "from_id": 374235301,
  "from_username": "username",
  "text": "Привет!",
  "message_id": 12345,
  "chat_id": 374235301
}
```

### Send (Lovable → CRM)
```http
POST https://tg.academyos.ru/telegram/send
{
  "phone": "79955073535",
  "to": "374235301",
  "text": "Здравствуйте!"
}
```

