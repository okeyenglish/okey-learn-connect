
# План: Миграция WPP на новый API msg.academyos.ru

## Текущая архитектура (старая)
- API в стиле WPP Connect: `/api/{session}/{secret}/generate-token`
- Глобальный секрет `WPP_SECRET` / `WPP_AGG_TOKEN` для всех организаций
- Сессии именуются как `org_{uuid}`

## Новая архитектура (msg.academyos.ru)
- Аутентификация: `POST /auth/token` с `{ "apiKey": "YOUR_API_KEY" }` возвращает JWT
- Аккаунты (номера телефонов) вместо сессий
- **Каждая организация имеет свой API Key** (хранится в `messenger_integrations.settings.wppApiKey`)
- Новый формат сообщений с `account` параметром

---

## Изменения базы данных

### Поля в `messenger_integrations.settings` для provider='wpp'
```text
{
  "wppApiKey": "API_KEY_для_организации",     // Required - уникальный ключ
  "wppAccountNumber": "79990001122",          // Required - номер WhatsApp аккаунта
  "wppWebhookUrl": "auto-generated"           // Автоматически
}
```

---

## Файлы для изменения

### 1. `supabase/functions/_shared/wpp.ts` - Полная переработка

**Новый WppClient:**
```text
class WppMsgClient {
  constructor(baseUrl: string, apiKey: string) {}
  
  async getToken(): Promise<string>
  // POST /auth/token { apiKey } → { token }
  
  async startAccount(number: string): Promise<StartResult>
  // POST /api/accounts/start { number }
  
  async getAccountStatus(number: string): Promise<AccountStatus>
  // GET /api/accounts/{number}/status
  
  async getAccountQr(number: string): Promise<string | null>
  // GET /api/accounts/{number}/qr
  
  async deleteAccount(number: string): Promise<void>
  // DELETE /api/accounts/{number}
  
  async registerWebhook(number: string, url: string): Promise<void>
  // POST /api/webhooks/{number} { url }
  
  async sendText(account: string, to: string, text: string): Promise<TaskResult>
  // POST /api/messages/text { account, to, text }
  
  async sendImage(account: string, to: string, imageUrl: string, caption?: string)
  async sendVideo(account: string, to: string, videoUrl: string)
  async sendFile(account: string, to: string, fileUrl: string, filename: string)
  async sendAudio(account: string, to: string, audioUrl: string)
}
```

### 2. `supabase/functions/wpp-start/index.ts`
```text
// Логика:
1. Получить integrationId из запроса или найти primary WPP интеграцию
2. Достать wppApiKey и wppAccountNumber из settings
3. Создать WppMsgClient с apiKey организации
4. Вызвать startAccount(number)
5. Если нужен QR → вернуть
6. Зарегистрировать webhook: POST /api/webhooks/{number}
```

### 3. `supabase/functions/wpp-status/index.ts`
```text
// Логика:
1. Найти WPP интеграцию организации
2. Создать WppMsgClient с её apiKey
3. Проверить статус через GET /api/accounts/{number}/status
4. Если нужен QR → GET /api/accounts/{number}/qr
```

### 4. `supabase/functions/wpp-send/index.ts`
```text
// Логика:
1. Найти WPP интеграцию для отправки (primary или из integration_id)
2. Создать WppMsgClient
3. Отправить сообщение через /api/messages/text|image|video|file

// Новый формат запроса:
POST /api/messages/text
{
  "account": "79990001122",  // номер аккаунта организации
  "to": "79991112233",       // номер получателя
  "text": "Hello!"
}
```

### 5. `supabase/functions/wpp-webhook/index.ts`
```text
// Новый формат событий (из документации):
{
  "id": "evt_123",
  "type": "message.incoming" | "qr" | "connected" | "offline" | "message.sent",
  "created": 1234567890,
  "data": { ... }
}

// Изменения:
1. Парсить новый формат событий
2. Для "qr" → сохранить QR в whatsapp_sessions
3. Для "connected" → обновить статус
4. Для "message.incoming" → создать chat_message
```

### 6. `supabase/functions/wpp-disconnect/index.ts`
```text
// DELETE /api/accounts/{number}
```

### 7. `src/components/admin/integrations/WhatsAppIntegrations.tsx`
```text
// Обновить поля для provider='wpp':
- wppApiKey (обязательное) - API ключ организации
- wppAccountNumber (обязательное) - номер телефона аккаунта
```

---

## Последовательность действий

### Этап 1: SDK и утилиты
1. Создать новый `WppMsgClient` в `_shared/wpp.ts`
2. Сохранить старый класс для обратной совместимости

### Этап 2: Edge Functions
3. Обновить `wpp-start` - использовать настройки из интеграции
4. Обновить `wpp-status` - новые эндпоинты
5. Обновить `wpp-send` - новый формат сообщений
6. Обновить `wpp-webhook` - новый формат событий
7. Обновить `wpp-disconnect` - новый эндпоинт

### Этап 3: UI
8. Обновить форму настроек WPP в админке

---

## API Mapping (Старый → Новый)

| Операция | Старый API | Новый API |
|----------|-----------|-----------|
| Токен | `POST /api/{session}/{secret}/generate-token` | `POST /auth/token` + `{ apiKey }` |
| Старт | `POST /session/{session}/start` | `POST /api/accounts/start` |
| Статус | `GET /session/{session}/status` | `GET /api/accounts/{number}/status` |
| QR | `GET /session/{session}/qr-code` | `GET /api/accounts/{number}/qr` |
| Отключение | `POST /api/{session}/logout-session` | `DELETE /api/accounts/{number}` |
| Webhook | В body startSession | `POST /api/webhooks/{number}` |
| Текст | `POST /api/{session}/send-message` | `POST /api/messages/text` |
| Файл | `POST /api/{session}/send-file-base64` | `POST /api/messages/image\|video\|file` |

---

## Формат webhook событий (Новый)

```text
// Входящее сообщение
{
  "id": "evt_123",
  "type": "message.incoming",
  "created": 1234567890,
  "data": {
    "account": "79990001122",
    "from": "79991112233", 
    "text": "Привет",
    "timestamp": 1234567890
  }
}

// QR код
{
  "type": "qr",
  "data": {
    "account": "79990001122",
    "qr": "base64..."
  }
}

// Подключение
{
  "type": "connected",
  "data": {
    "account": "79990001122"
  }
}
```

---

## Результат

После миграции:
- Каждая организация имеет собственный API ключ
- Поддержка нескольких WhatsApp аккаунтов на организацию
- Унифицированный формат с другими интеграциями (Green API, Wappi)
- Все настройки в `messenger_integrations.settings`
