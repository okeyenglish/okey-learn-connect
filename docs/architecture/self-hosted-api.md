# Self-Hosted API Architecture

> **Дата:** 2026-01-26  
> **Версия:** 1.0  
> **Endpoint:** https://api.academyos.ru

## Обзор

Проект использует self-hosted Supabase инстанс для всех Edge Functions. Для унификации вызовов создан helper `selfHostedApi`, который заменяет прямые вызовы `supabase.functions.invoke`.

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (React/Vite)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  selfHostedPost  │    │  selfHostedGet   │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                              │
│           └───────────┬───────────┘                              │
│                       ▼                                          │
│           ┌───────────────────────┐                              │
│           │    selfHostedApi.ts   │                              │
│           │  ├─ Auth token inject │                              │
│           │  ├─ Error handling    │                              │
│           │  └─ Response parsing  │                              │
│           └───────────┬───────────┘                              │
│                       │                                          │
└───────────────────────┼──────────────────────────────────────────┘
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              Self-Hosted Supabase (api.academyos.ru)            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Edge Runtime                          │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │
│  │  │  main   │→ │ wpp-*   │  │ max-*   │  │telegram-│    │    │
│  │  │ router  │  │         │  │         │  │   *     │    │    │
│  │  └────┬────┘  └─────────┘  └─────────┘  └─────────┘    │    │
│  │       │       ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │
│  │       └──────→│ ask     │  │ voice-  │  │ import- │    │    │
│  │               │         │  │assistant│  │holihope │    │    │
│  │               └─────────┘  └─────────┘  └─────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    PostgreSQL 17                         │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## API Helper: `src/lib/selfHostedApi.ts`

### Основные функции

```typescript
// POST запрос с авторизацией
selfHostedPost<T>(functionName: string, body?: object, options?: { requireAuth?: boolean }): Promise<ApiResponse<T>>

// GET запрос с авторизацией  
selfHostedGet<T>(functionName: string, options?: { requireAuth?: boolean }): Promise<ApiResponse<T>>
```

### Интерфейс ответа

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Особенности

| Функция | Описание |
|---------|----------|
| **Auto Auth** | Автоматически добавляет JWT токен из сессии |
| **Error Handling** | Унифицированная обработка ошибок |
| **Type Safety** | Полная типизация ответов через generics |
| **Public Endpoints** | Поддержка `{ requireAuth: false }` для публичных API |

## Мигрированные компоненты

### Мессенджеры и коммуникации

| Компонент | Функции | Описание |
|-----------|---------|----------|
| `MessengerSettings.tsx` | wpp-status, wpp-start, wpp-disconnect | Управление WhatsApp сессиями |
| `WappiSettings.tsx` | wappi-whatsapp-status | Статус Wappi интеграции |
| `TelegramSettings.tsx` | telegram-channels | Telegram каналы |
| `OnlinePBXSettings.tsx` | onlinepbx-settings, test-onlinepbx | Настройки телефонии |
| `WebRTCPhone.tsx` | onlinepbx-call | Исходящие звонки |
| `MobilePhoneHelper.tsx` | onlinepbx-call | Мобильные звонки |

### AI и голосовые функции

| Компонент | Функции | Описание |
|-----------|---------|----------|
| `VoiceAssistant.tsx` | voice-assistant | Голосовой ассистент |
| `AIHub.tsx` | ai-consultant, transcribe-audio | AI консультант |
| `ChatBot.tsx` | ask | Публичный чат-бот |
| `AIProviderSettings.tsx` | get-ai-provider, set-ai-provider | Настройки AI провайдера |

### Импорт данных

| Компонент | Функции | Описание |
|-----------|---------|----------|
| `HolihopeImport.tsx` | import-holihope (8 вызовов) | Импорт из Holihope CRM |
| `HolihopeImport.tsx` | import-salebot-chats, import-salebot-chats-auto, salebot-stop | Импорт чатов Salebot |
| `ContentIndexer.tsx` | index-content | Индексация контента для RAG |

### Платежи и финансы

| Компонент | Функции | Описание |
|-----------|---------|----------|
| `SendPaymentLinkModal.tsx` | tbank-init-client | Инициализация платежа клиента |
| `PaymentSuccess.tsx` | tbank-status | Проверка статуса платежа |
| `AutomationSettingsPanel.tsx` | auto-payment-notifications, send-payment-notifications | Автоматические уведомления |

### Администрирование

| Компонент | Функции | Описание |
|-----------|---------|----------|
| `SystemMonitor.tsx` | edge-health-monitor | Мониторинг Edge Functions |
| `SystemMonitorPanel.tsx` | edge-health-monitor | Панель здоровья системы |

### SEO и контент

| Компонент | Функции | Описание |
|-----------|---------|----------|
| `SeoPages.tsx` | seo-analyze-page | Анализ SEO страниц |
| `wordstatAnalyzer.ts` | seo-wordstat | Статистика Wordstat |

### Публичные формы (без авторизации)

| Компонент | Функции | Описание |
|-----------|---------|----------|
| `Contacts.tsx` | webhook-proxy | Форма обратной связи |
| `About.tsx` | webhook-proxy | Заявка на франшизу |
| `PlacementTestComponent.tsx` | webhook-proxy | Отправка результатов теста |
| `ScheduleTable.tsx` | webhook-proxy | Запись на занятие |
| `SpeakingClubSignupModal.tsx` | webhook-proxy | Запись в Speaking Club |

### Учительский портал

| Компонент | Функции | Описание |
|-----------|---------|----------|
| `AppViewer.tsx` | manage-app | Логирование использования приложений |

## Edge Functions (107 функций)

### Категории функций

```
📁 Мессенджеры (35)
├── wpp-* (12) - WhatsApp через WPP
├── wappi-* (6) - WhatsApp через Wappi  
├── whatsapp-* (8) - Green API
├── telegram-* (5) - Telegram Bot
└── max-* (10) - MAX messenger

📁 AI/ML (12)
├── voice-assistant
├── ai-consultant
├── chat-with-ai
├── generate-gpt-response
├── generate-delayed-gpt-response
├── transcribe-audio
├── generate-image
├── ask
├── teacher-assistant
├── homework-suggestions
├── suggest-or-generate
└── ai-settings

📁 SEO (14)
├── seo-suggest-ideas
├── seo-create-brief
├── seo-generate-content
├── seo-analyze-page
├── seo-reoptimize-page
├── seo-yandex-export
├── seo-indexnow
├── seo-collect-wordstat
├── seo-import-gsc
├── seo-yandex-info
├── seo-check-tokens
├── seo-wordstat
├── seo-enrich-clusters
└── seo-auto-cluster

📁 Импорт/Экспорт (8)
├── import-holihope
├── import-students
├── import-salebot-chats
├── import-salebot-chats-auto
├── import-salebot-ids-csv
├── get-employees
├── sync-auto-groups
└── sync-single-auto-group

📁 Платежи (5)
├── tbank-init
├── tbank-init-client
├── tbank-webhook
├── tbank-status
└── auto-payment-notifications

📁 Телефония (5)
├── onlinepbx-call
├── onlinepbx-webhook
├── onlinepbx-settings
├── test-onlinepbx
└── migrate-onlinepbx-settings

📁 Система (18)
├── edge-health-monitor
├── sla-monitor
├── process-events
├── refresh-chat-threads-mv
├── lesson-reminders
├── send-push-notification
├── admin-reset-password
├── qr-login-*
├── sso-*
└── check-user-access

📁 Прочее (10)
├── bbb-meeting
├── create-teacher-rooms
├── webhook-proxy
├── sitemap
├── index-content
├── generate-call-summary
├── analyze-call
└── request-callback
```

## Примеры использования

### Авторизованный запрос

```typescript
import { selfHostedPost } from '@/lib/selfHostedApi';

const response = await selfHostedPost<{ status: string }>('wpp-status', {
  session_name: 'org_xxx'
});

if (response.success) {
  console.log(response.data?.status);
} else {
  console.error(response.error);
}
```

### Публичный запрос (без авторизации)

```typescript
import { selfHostedPost } from '@/lib/selfHostedApi';

const response = await selfHostedPost('webhook-proxy', {
  source: 'contact_form',
  phone: '+7999...',
  name: 'Иван'
}, { requireAuth: false });
```

### GET запрос

```typescript
import { selfHostedGet } from '@/lib/selfHostedApi';

const response = await selfHostedGet<{ provider: string }>('get-ai-provider');
```

## Конфигурация

### Переменные окружения

```env
VITE_SUPABASE_URL=https://api.academyos.ru
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Docker Compose (Edge Runtime)

```yaml
functions:
  image: supabase/edge-runtime:v1.69.28
  command: ["start", "--main-service", "/home/deno/functions/main"]
  environment:
    - SUPABASE_URL=http://kong:8000
    - SUPABASE_ANON_KEY=${ANON_KEY}
    - SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
    - OPENAI_API_KEY=${OPENAI_API_KEY}
    # ... остальные секреты
```

## Миграция с supabase.functions.invoke

### До миграции

```typescript
const { data, error } = await supabase.functions.invoke('voice-assistant', {
  body: { text: message }
});

if (error) throw error;
```

### После миграции

```typescript
const response = await selfHostedPost<VoiceResponse>('voice-assistant', { 
  text: message 
});

if (!response.success) throw new Error(response.error);
const data = response.data;
```

## Связанные документы

- [Edge Functions Deployment](../migration/11-edge-functions-deployment.md)
- [Database Schema](../migration/01-database-schema.sql)
- [Secrets Configuration](../migration/05-secrets.md)
- [Webhooks](../migration/10-webhooks.md)
