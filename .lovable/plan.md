

# План: Добавление всех эндпоинтов Telegram CRM API

## Анализ API tg.academyos.ru

На основе OpenAPI спецификации доступны следующие эндпоинты:

### Управление профилями (сессиями)
| Endpoint | Метод | Описание | Статус |
|----------|-------|----------|--------|
| `GET /health` | GET | Проверка состояния сервера | Новый |
| `GET /profiles` | GET | Список всех профилей | Новый |
| `POST /profiles?phone=` | POST | Создание профиля | Новый |
| `POST /profiles/{phone}/start` | POST | Запуск профиля | Новый |
| `POST /profiles/{phone}/stop` | POST | Остановка профиля | Новый |
| `DELETE /profiles/{phone}` | DELETE | Удаление профиля | Новый |

### Авторизация
| Endpoint | Метод | Схема | Статус |
|----------|-------|-------|--------|
| `POST /telegram/send_code` | POST | `{ phone }` | Реализован (telegram-crm-send-code) |
| `POST /telegram/confirm_code` | POST | `{ phone, code }` | Реализован (telegram-crm-verify-code) |

### Отправка сообщений
| Endpoint | Метод | Схема | Статус |
|----------|-------|-------|--------|
| `POST /telegram/send` | POST | `{ phone, to, text }` | Реализован (telegram-crm-send) |
| `POST /telegram/send_photo` | POST | multipart: `phone, to, file` | Новый |
| `POST /telegram/send_video` | POST | multipart: `phone, to, file` | Новый |
| `POST /telegram/send_voice` | POST | multipart: `phone, to, file` | Новый |
| `POST /telegram/send_file` | POST | multipart: `phone, to, file` | Новый |

### Webhook
| Endpoint | Метод | Схема | Статус |
|----------|-------|-------|--------|
| `POST /webhook/connect` | POST | `{ name, webhook_url, secret? }` | Реализован (telegram-crm-verify-code) |
| `GET /webhooks/queue` | GET | Очередь вебхуков | Новый |
| `GET /webhooks/dlq` | GET | Dead Letter Queue | Новый |

## Новые Edge Functions

### 1. telegram-crm-health — Проверка статуса сервера

```typescript
// GET /health → проверка доступности tg.academyos.ru
Deno.serve(async (req) => {
  const response = await fetch('https://tg.academyos.ru/health');
  return { success: true, status: response.ok };
});
```

### 2. telegram-crm-profiles — Управление профилями

```typescript
// Операции: list, create, start, stop, delete
Deno.serve(async (req) => {
  const { action, phone } = await req.json();
  
  switch (action) {
    case 'list':
      return GET /profiles
    case 'create':
      return POST /profiles?phone=${phone}
    case 'start':
      return POST /profiles/${phone}/start
    case 'stop':
      return POST /profiles/${phone}/stop
    case 'delete':
      return DELETE /profiles/${phone}
  }
});
```

### 3. telegram-crm-send-media — Отправка медиа (multipart)

```typescript
// Поддержка: photo, video, voice, file
interface SendMediaRequest {
  clientId: string;
  mediaType: 'photo' | 'video' | 'voice' | 'file';
  fileUrl?: string;     // URL для скачивания
  fileData?: string;    // Base64
  fileName?: string;
}

Deno.serve(async (req) => {
  // 1. Получить интеграцию
  // 2. Получить клиента и recipient
  // 3. Скачать файл или декодировать base64
  // 4. POST multipart/form-data на нужный endpoint
  // 5. Сохранить в chat_messages
});
```

### 4. telegram-crm-webhooks — Мониторинг вебхуков

```typescript
// Получение очереди и DLQ для отладки
Deno.serve(async (req) => {
  const { action } = await req.json();
  
  if (action === 'queue') {
    return GET /webhooks/queue
  } else if (action === 'dlq') {
    return GET /webhooks/dlq
  }
});
```

## Обновление существующих функций

### telegram-crm-send — Исправить устаревший интерфейс

```typescript
// БЫЛО:
interface TelegramCrmSettings {
  crmApiUrl: string;
  crmApiKey: string;    // Больше не используется!
  crmPhoneNumber: string;
}

// СТАНЕТ:
interface TelegramCrmSettings {
  crmApiUrl: string;     // https://tg.academyos.ru (фиксированный)
  crmPhoneNumber: string;
  secret?: string;       // webhook_key для X-Lovable-Secret
}

// Убрать проверку crmApiKey (строка 146)
```

### telegram-crm-verify-code — Исправить endpoint авторизации

```typescript
// БЫЛО (строка 74):
fetch(`${TELEGRAM_CRM_API_URL}/auth/verify-code`, ...)

// СТАНЕТ (по OpenAPI):
fetch(`${TELEGRAM_CRM_API_URL}/telegram/confirm_code`, ...)
```

### telegram-crm-send-code — Исправить endpoint

```typescript
// БЫЛО:
fetch(`${TELEGRAM_CRM_API_URL}/auth/send-code`, ...)

// СТАНЕТ (по OpenAPI):
fetch(`${TELEGRAM_CRM_API_URL}/telegram/send_code`, ...)
```

### telegram-crm-connect — Удалить или deprecate

Этот файл использует старый flow с `crmApiUrl` и `crmApiKey`. Так как теперь используется OTP через `telegram-crm-verify-code`, этот файл можно:
- Удалить
- Или оставить для совместимости, но не использовать в UI

## Обновление UI

### TelegramIntegrations.tsx — Добавить управление сессиями

```typescript
// Добавить кнопку "Статус профиля" для telegram_crm
// Показывать: запущен / остановлен
// Действия: Start / Stop / Restart
```

### Новый компонент TelegramCrmProfileStatus.tsx

```typescript
// Показывает статус профиля (сессии Telethon)
// Кнопки: Запустить / Остановить / Перезапустить
// Индикатор: Online / Offline / Error
```

## Файлы для создания/изменения

| Файл | Действие | Описание |
|------|----------|----------|
| `supabase/functions/telegram-crm-health/index.ts` | Создать | Проверка состояния сервера |
| `supabase/functions/telegram-crm-profiles/index.ts` | Создать | Управление профилями |
| `supabase/functions/telegram-crm-send-media/index.ts` | Создать | Отправка фото/видео/голоса/файлов |
| `supabase/functions/telegram-crm-webhooks/index.ts` | Создать | Мониторинг вебхуков |
| `supabase/functions/telegram-crm-send/index.ts` | Обновить | Убрать crmApiKey |
| `supabase/functions/telegram-crm-send-code/index.ts` | Обновить | Endpoint `/telegram/send_code` |
| `supabase/functions/telegram-crm-verify-code/index.ts` | Обновить | Endpoint `/telegram/confirm_code` |
| `supabase/config.toml` | Обновить | Добавить новые функции |
| `src/components/admin/integrations/TelegramCrmProfileStatus.tsx` | Создать | UI статуса профиля |
| `src/components/admin/integrations/TelegramIntegrations.tsx` | Обновить | Добавить управление |

## API tg.academyos.ru — Полная схема

### Schemas (из OpenAPI)

```typescript
// SendCode
interface SendCode {
  phone: string;  // required
}

// ConfirmCode  
interface ConfirmCode {
  phone: string;  // required
  code: string;   // required
}

// TelegramSend
interface TelegramSend {
  phone: string;  // required - номер аккаунта-отправителя
  to: string;     // required - telegram ID или username получателя
  text: string;   // required - текст сообщения
}

// WebhookConnect
interface WebhookConnect {
  name: string;        // required
  webhook_url: string; // required
  secret?: string;     // optional
}

// Media send (multipart/form-data)
interface MediaSend {
  phone: string;       // required
  to: string;          // required  
  file: File;          // required - binary
}
```

## Порядок реализации

1. **Исправить существующие функции** — endpoints авторизации
2. **telegram-crm-health** — простая проверка доступности
3. **telegram-crm-profiles** — управление сессиями
4. **telegram-crm-send-media** — отправка медиа
5. **telegram-crm-webhooks** — мониторинг (для отладки)
6. **UI обновления** — статус профиля и управление

## Безопасность

- Все новые функции требуют авторизации пользователя
- Проверка organization_id через профиль
- Сервер tg.academyos.ru не требует API Key (stateless по номеру телефона)

