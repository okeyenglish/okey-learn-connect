
# План: Добавление Telegram CRM (Telethon) интеграции

## Обзор

Добавляем второй способ подключения Telegram помимо Wappi.pro — через self-hosted FastAPI сервер с Telethon. Это даст:
- Полный контроль над Telegram User API
- Отсутствие зависимости от стороннего сервиса
- Автоматическую регистрацию webhook при подключении

## Архитектура

```text
Lovable Frontend
      │
      ├─▶ telegram-crm-connect (Edge Function)
      │         │
      │         ▼
      │   telegram-crm (FastAPI/Telethon)
      │         │
      │         ├─ POST /integration/lovable/connect
      │         └─ POST /telegram/send
      │
      └─▶ telegram-crm-send (Edge Function)
                │
                ▼
          telegram-crm (FastAPI)
                │
                └─ POST /telegram/send

telegram-listener (Telethon)
      │
      ▼
telegram-crm-webhook (Edge Function) ◀── Входящие сообщения
```

## Изменения

### 1. Frontend — TelegramIntegrations.tsx

Добавить второй провайдер:

```typescript
const telegramProviders = [
  { 
    value: 'wappi', 
    label: 'Wappi.pro User API', 
    description: 'Интеграция через облачный сервис Wappi.pro' 
  },
  { 
    value: 'telegram_crm', 
    label: 'Telegram CRM (Self-Hosted)', 
    description: 'Собственный сервер с Telethon — полный контроль' 
  },
];

const telegramFields: SettingsFieldConfig[] = [
  // Wappi fields
  {
    key: 'profileId',
    label: 'Profile ID',
    type: 'text',
    showForProviders: ['wappi'],
    required: true,
  },
  {
    key: 'apiToken', 
    label: 'API Token',
    type: 'password',
    showForProviders: ['wappi'],
    required: true,
  },
  // Telegram CRM fields
  {
    key: 'crmApiUrl',
    label: 'API URL сервера',
    type: 'url',
    placeholder: 'https://telegram.academyos.ru',
    showForProviders: ['telegram_crm'],
    required: true,
  },
  {
    key: 'crmApiKey',
    label: 'API Key',
    type: 'password',
    showForProviders: ['telegram_crm'],
    required: true,
  },
  {
    key: 'crmPhoneNumber',
    label: 'Номер телефона Telegram',
    type: 'text',
    placeholder: '+79955073535',
    showForProviders: ['telegram_crm'],
    required: true,
  },
];
```

### 2. Edge Function — telegram-crm-connect

Подключение к self-hosted серверу с автоматической регистрацией webhook:

```typescript
// supabase/functions/telegram-crm-connect/index.ts
Deno.serve(async (req) => {
  // 1. Получить данные из request
  const { crmApiUrl, crmApiKey, crmPhoneNumber } = await req.json();
  
  // 2. Вызвать /integration/lovable/connect на telegram-crm
  const webhookUrl = `${SELF_HOSTED_URL}/functions/v1/telegram-crm-webhook`;
  
  await fetch(`${crmApiUrl}/integration/lovable/connect`, {
    method: 'POST',
    headers: {
      'X-API-Key': crmApiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      project_id: organizationId,
      webhook_url: webhookUrl,
      phone: crmPhoneNumber
    })
  });
  
  // 3. Сохранить в messenger_integrations
  // 4. Вернуть статус подключения
});
```

### 3. Edge Function — telegram-crm-send

Отправка сообщений через self-hosted сервер:

```typescript
// supabase/functions/telegram-crm-send/index.ts
Deno.serve(async (req) => {
  // 1. Получить настройки интеграции (crmApiUrl, crmApiKey, crmPhoneNumber)
  // 2. Получить recipient из client
  
  const response = await fetch(`${crmApiUrl}/telegram/send`, {
    method: 'POST',
    headers: {
      'X-API-Key': crmApiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      project_id: organizationId,
      phone: crmPhoneNumber,  // аккаунт отправителя
      to: recipientPhone,     // получатель
      text: messageText
    })
  });
  
  // 3. Сохранить сообщение в БД
});
```

### 4. Edge Function — telegram-crm-webhook

Прием входящих сообщений от telegram-crm:

```typescript
// supabase/functions/telegram-crm-webhook/index.ts
Deno.serve(async (req) => {
  const payload = await req.json();
  // {
  //   project_id: "org-uuid",
  //   account_phone: "79955073535",
  //   from_id: 374235301,
  //   from_username: "username",
  //   text: "Привет!"
  // }
  
  // 1. Найти интеграцию по project_id
  // 2. Найти или создать клиента по from_id
  // 3. Сохранить сообщение в chat_messages
  // 4. Отправить push-уведомления
});
```

### 5. Обновить telegram-send (роутинг по провайдеру)

```typescript
// Добавить проверку провайдера
const { data: integration } = await supabase
  .from('messenger_integrations')
  .select('provider, settings')
  .eq('organization_id', orgId)
  .eq('messenger_type', 'telegram')
  .eq('is_primary', true)
  .single();

if (integration.provider === 'telegram_crm') {
  // Вызвать telegram-crm-send
  return await supabase.functions.invoke('telegram-crm-send', { body });
}

// Иначе — Wappi (текущая логика)
```

### 6. Конфигурация supabase/config.toml

```toml
[functions.telegram-crm-connect]
verify_jwt = false

[functions.telegram-crm-send]
verify_jwt = false

[functions.telegram-crm-webhook]
verify_jwt = false
```

## Структура файлов

```
src/
├── components/admin/integrations/
│   └── TelegramIntegrations.tsx  # Обновить
│
supabase/functions/
├── telegram-crm-connect/
│   └── index.ts                  # Новый
├── telegram-crm-send/
│   └── index.ts                  # Новый
├── telegram-crm-webhook/
│   └── index.ts                  # Новый
├── telegram-send/
│   └── index.ts                  # Обновить (роутинг)
└── _shared/
    └── types.ts                  # Добавить типы
```

## Безопасность

1. **API Key** — для аутентификации запросов к telegram-crm
2. **Webhook Secret** — опциональный shared secret в заголовке X-Lovable-Secret
3. **Organization Isolation** — project_id = organization_id для изоляции данных

## Требования к telegram-crm серверу

Сервер должен реализовать:

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/integration/lovable/connect` | POST | Регистрация webhook |
| `/telegram/send` | POST | Отправка сообщения |
| `/telegram/status` | GET | Проверка статуса (опционально) |

## Порядок реализации

1. Обновить `TelegramIntegrations.tsx` — добавить провайдер и поля
2. Создать `telegram-crm-webhook` — прием входящих
3. Создать `telegram-crm-send` — отправка сообщений  
4. Создать `telegram-crm-connect` — подключение
5. Обновить `telegram-send` — роутинг по провайдеру
6. Обновить `supabase/config.toml`
7. Добавить типы в `_shared/types.ts`
