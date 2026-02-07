
# План: Упрощение подключения Telegram CRM (OTP-авторизация)

## Текущее состояние

Сейчас для подключения Telegram CRM требуется ввести:
- API URL сервера
- API Key
- Номер телефона

## Желаемое состояние

Простой двухшаговый flow:
1. Ввести номер телефона → нажать "Отправить код"
2. Ввести 5-значный код из Telegram → интеграция активирована

Сервер фиксирован: `https://tg.academyos.ru`

## Архитектура

```text
Пользователь
    │
    ├─ 1. Вводит номер телефона
    │      │
    │      ▼
    │   telegram-crm-send-code
    │      │
    │      ▼
    │   tg.academyos.ru/auth/send-code
    │      │
    │      ▼
    │   Telegram отправляет код
    │
    ├─ 2. Вводит код
    │      │
    │      ▼
    │   telegram-crm-verify-code
    │      │
    │      ▼
    │   tg.academyos.ru/auth/verify-code
    │      │
    │      ▼
    │   Создание интеграции + регистрация webhook
    │
    └─ ✓ Готово
```

## Изменения

### 1. Новый компонент TelegramCrmConnectDialog

Создать `src/components/admin/integrations/TelegramCrmConnectDialog.tsx`:

- **Step 1: Ввод номера**
  - Input для номера телефона (+7...)
  - Кнопка "Отправить код"
  - Показ ошибок (неверный номер, сервер недоступен)

- **Step 2: Ввод кода**
  - InputOTP для 5-значного кода
  - Таймер повторной отправки (60 сек)
  - Кнопка "Отправить заново"
  - Автоматическая проверка при вводе 5 цифр

### 2. Edge Function: telegram-crm-send-code

Создать `supabase/functions/telegram-crm-send-code/index.ts`:

```typescript
// Request
POST /telegram-crm-send-code
{ phone: "+79955073535" }

// Логика:
1. Валидация номера телефона
2. POST https://tg.academyos.ru/auth/send-code
   { phone: "79955073535" }
3. Возврат { success: true, phone_hash: "..." }
```

### 3. Edge Function: telegram-crm-verify-code

Создать `supabase/functions/telegram-crm-verify-code/index.ts`:

```typescript
// Request
POST /telegram-crm-verify-code
{ 
  phone: "+79955073535",
  code: "12345",
  phone_hash: "...",
  name: "Основной аккаунт"
}

// Логика:
1. POST https://tg.academyos.ru/auth/verify-code
   { phone, code, phone_hash }
2. Если успешно — регистрация webhook:
   POST https://tg.academyos.ru/webhook/connect
   { name: "lovable", webhook_url: "...?key=UUID", secret: "..." }
3. Создание записи в messenger_integrations
4. Возврат { success: true, integrationId: "..." }
```

### 4. Обновление TelegramIntegrations.tsx

- Для провайдера `telegram_crm` открывать `TelegramCrmConnectDialog` вместо стандартного `IntegrationEditDialog`
- Убрать поля `crmApiUrl` и `crmApiKey` из конфигурации telegram_crm
- Оставить только визуальное отображение в списке

### 5. Обновление TelegramIntegrations fields

```typescript
// БЫЛО:
const telegramFields: SettingsFieldConfig[] = [
  { key: 'crmApiUrl', ... showForProviders: ['telegram_crm'] },
  { key: 'crmApiKey', ... showForProviders: ['telegram_crm'] },
  { key: 'crmPhoneNumber', ... showForProviders: ['telegram_crm'] },
];

// СТАНЕТ:
// Для telegram_crm поля не нужны — используется отдельный диалог
// Для wappi оставляем как есть
```

## UI/UX Flow

### Step 1: Ввод номера
```
┌─────────────────────────────────────┐
│     Подключение Telegram            │
│                                     │
│  Введите номер телефона Telegram    │
│  аккаунта для интеграции            │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ +7 955 073 53 35            │    │
│  └─────────────────────────────┘    │
│                                     │
│         [Отправить код]             │
└─────────────────────────────────────┘
```

### Step 2: Ввод кода
```
┌─────────────────────────────────────┐
│     Подключение Telegram            │
│                                     │
│  Код отправлен в Telegram           │
│  на номер +7 955 *** ** 35          │
│                                     │
│     ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐             │
│     │1│ │2│ │3│ │4│ │5│             │
│     └─┘ └─┘ └─┘ └─┘ └─┘             │
│                                     │
│     Отправить заново (45 сек)       │
│                                     │
│  ← Изменить номер     [Подтвердить] │
└─────────────────────────────────────┘
```

## Предполагаемый API tg.academyos.ru

| Endpoint | Метод | Body | Response |
|----------|-------|------|----------|
| `/auth/send-code` | POST | `{ phone }` | `{ success, phone_hash }` |
| `/auth/verify-code` | POST | `{ phone, code, phone_hash }` | `{ success, session_id }` |
| `/webhook/connect` | POST | `{ name, webhook_url, secret }` | `{ success }` |
| `/telegram/send` | POST | `{ phone, to, text }` | `{ success }` |

## Файлы для создания/изменения

| Файл | Действие | Описание |
|------|----------|----------|
| `src/components/admin/integrations/TelegramCrmConnectDialog.tsx` | Создать | Диалог с OTP flow |
| `supabase/functions/telegram-crm-send-code/index.ts` | Создать | Отправка кода |
| `supabase/functions/telegram-crm-verify-code/index.ts` | Создать | Проверка кода + создание интеграции |
| `src/components/admin/integrations/TelegramIntegrations.tsx` | Обновить | Использовать новый диалог |
| `supabase/config.toml` | Обновить | Добавить новые функции |
| `src/components/admin/integrations/index.ts` | Обновить | Экспортировать новый диалог |

## Константы (hardcoded)

```typescript
const TELEGRAM_CRM_API_URL = 'https://tg.academyos.ru';
```

## Безопасность

- Номер телефона маскируется в UI: `+7 955 *** ** 35`
- Код подтверждения действует ограниченное время
- webhook_key генерируется на стороне Lovable (UUID)
- X-Lovable-Secret используется для подписи запросов

## Зависимости

На стороне сервера tg.academyos.ru должны быть реализованы:
- `/auth/send-code` — отправка кода в Telegram
- `/auth/verify-code` — проверка кода
- `/webhook/connect` — регистрация webhook (уже есть)
- `/telegram/send` — отправка сообщений (уже есть)
