# Edge Functions (107 шт.)

> Все Supabase Edge Functions проекта

## Категории

### 🤖 AI / GPT (12 функций)

| Функция | Назначение | Секреты | JWT |
|---------|-----------|---------|-----|
| `ai-consultant` | AI консультант | OPENAI_API_KEY | ✓ |
| `chat-with-ai` | Чат с AI | OPENAI_API_KEY | ✓ |
| `generate-app` | Генерация приложений | OPENAI_API_KEY | ✓ |
| `generate-gpt-response` | GPT ответы | OPENAI_API_KEY | ✓ |
| `suggest-or-generate` | Подсказки/генерация | OPENAI_API_KEY | ✓ |
| `teacher-assistant` | Ассистент учителя | LOVABLE_API_KEY | ✓ |
| `transcribe-audio` | Транскрибация аудио | OPENAI_API_KEY | ✓ |
| `test-vertex-ai` | Тест Vertex AI | - | ✓ |
| `set-ai-provider` | Установка AI провайдера | - | ✓ |

### 📱 Telegram (7 функций)

| Функция | Назначение | Секреты | JWT |
|---------|-----------|---------|-----|
| `telegram-webhook` | Webhook Telegram | - | ✗ |
| `telegram-send` | Отправка сообщений | WAPPI_API_TOKEN | ✓ |
| `telegram-channels` | Управление каналами | WAPPI_API_TOKEN | ✓ |
| `telegram-get-avatar` | Получение аватара | WAPPI_API_TOKEN | ✓ |
| `telegram-get-contact-info` | Инфо о контакте | WAPPI_API_TOKEN | ✓ |

### 💬 WhatsApp - Green API (4 функции)

| Функция | Назначение | Секреты | JWT |
|---------|-----------|---------|-----|
| `whatsapp-webhook` | Webhook Green API | - | ✗ |
| `whatsapp-send` | Отправка сообщений | GREEN_API_* | ✓ |
| `whatsapp-channels` | Управление каналами | GREEN_API_* | ✓ |
| `whatsapp-get-avatar` | Получение аватара | GREEN_API_* | ✓ |

### 💬 WhatsApp - Wappi (5 функций)

| Функция | Назначение | Секреты | JWT |
|---------|-----------|---------|-----|
| `wappi-whatsapp-webhook` | Webhook Wappi | - | ✗ |
| `wappi-whatsapp-send` | Отправка сообщений | - | ✓ |
| `wappi-whatsapp-download` | Скачивание медиа | - | ✓ |
| `wappi-whatsapp-edit` | Редактирование сообщений | - | ✓ |
| `wappi-whatsapp-delete` | Удаление сообщений | - | ✓ |

### 💬 WhatsApp - WPP Connect (4 функции)

| Функция | Назначение | Секреты | JWT |
|---------|-----------|---------|-----|
| `wpp-webhook` | Webhook WPP | - | ✗ |
| `wpp-send` | Отправка сообщений | WPP_HOST, WPP_SECRET | ✓ |
| `wpp-channels` | Управление каналами | WPP_HOST, WPP_SECRET | ✓ |
| `wpp-get-avatar` | Получение аватара | WPP_HOST, WPP_SECRET | ✓ |

### 📱 MAX (Telegram альтернатива) (2 функции)

| Функция | Назначение | Секреты | JWT |
|---------|-----------|---------|-----|
| `max-webhook` | Webhook MAX | - | ✗ |
| `max-send` | Отправка сообщений | - | ✓ |

### 🤖 Salebot (4 функции)

| Функция | Назначение | Секреты | JWT |
|---------|-----------|---------|-----|
| `salebot-webhook` | Webhook Salebot | - | ✗ |
| `salebot-import` | Импорт данных | SALEBOT_API_KEY | ✓ |
| `salebot-stop` | Остановка импорта | - | ✗ |
| `salebot-export-client` | Экспорт клиента | SALEBOT_API_KEY | ✓ |

### 💳 T-Bank Payments (4 функции)

| Функция | Назначение | Секреты | JWT |
|---------|-----------|---------|-----|
| `tbank-webhook` | Webhook платежей | - | ✗ |
| `tbank-init` | Инициализация платежа | - | ✓ |
| `tbank-init-client` | Платёж для клиента | - | ✓ |
| `tbank-status` | Статус платежа | - | ✓ |

### 📞 Телефония (4 функции)

| Функция | Назначение | Секреты | JWT |
|---------|-----------|---------|-----|
| `onlinepbx-webhook` | Webhook OnlinePBX | - | ✗ |
| `test-onlinepbx` | Тест подключения | - | ✓ |
| `request-callback` | Запрос обратного звонка | - | ✓ |

### 🔔 Push Notifications (1 функция)

| Функция | Назначение | Секреты | JWT |
|---------|-----------|---------|-----|
| `send-push-notification` | Push уведомления | VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY | ✓ |

### 📊 SEO (12 функций)

| Функция | Назначение | Секреты | JWT |
|---------|-----------|---------|-----|
| `seo-analyze-page` | Анализ страницы | OPENAI_API_KEY | ✓ |
| `seo-auto-cluster` | Авто-кластеризация | - | ✓ |
| `seo-check-tokens` | Проверка токенов | YANDEX_* | ✓ |
| `seo-collect-wordstat` | Сбор Wordstat | YANDEX_DIRECT_TOKEN | ✓ |
| `seo-create-brief` | Создание брифа | OPENAI_API_KEY | ✓ |
| `seo-enrich-clusters` | Обогащение кластеров | YANDEX_DIRECT_TOKEN | ✓ |
| `seo-generate-content` | Генерация контента | OPENAI_API_KEY | ✓ |
| `seo-import-gsc` | Импорт GSC | GOOGLE_SERVICE_ACCOUNT | ✓ |
| `seo-indexnow` | IndexNow | INDEXNOW_KEY | ✓ |
| `seo-reoptimize-page` | Реоптимизация | OPENAI_API_KEY | ✓ |
| `seo-suggest-ideas` | Идеи контента | OPENAI_API_KEY | ✓ |
| `seo-wordstat` | Wordstat API | YANDEX_DIRECT_TOKEN | ✓ |
| `seo-yandex-export` | Экспорт Yandex | YANDEX_OAUTH_TOKEN | ✓ |
| `seo-yandex-info` | Инфо Yandex | YANDEX_OAUTH_TOKEN | ✓ |

### 📧 Email (2 функции)

| Функция | Назначение | Секреты | JWT |
|---------|-----------|---------|-----|
| `send-email` | Отправка email | RESEND_API_KEY | ✓ |
| `send-payment-notifications` | Уведомления о платежах | - | ✓ |

### 🗓️ Расписание/Уроки (5 функций)

| Функция | Назначение | Секреты | JWT |
|---------|-----------|---------|-----|
| `lesson-reminders` | Напоминания об уроках | - | ✗ |
| `sync-auto-groups` | Синхронизация авто-групп | - | ✓ |
| `sync-single-auto-group` | Синхронизация группы | - | ✓ |

### 🌐 Публичные (3 функции)

| Функция | Назначение | Секреты | JWT |
|---------|-----------|---------|-----|
| `sitemap` | Генерация sitemap | - | ✗ |
| `webhook-proxy` | Прокси вебхуков | - | ✗ |

### 📱 Apps (Каталог приложений) (2 функции)

| Функция | Назначение | Секреты | JWT |
|---------|-----------|---------|-----|
| `publish-app` | Публикация приложения | - | ✓ |

### 📊 Мониторинг (1 функция)

| Функция | Назначение | Секреты | JWT |
|---------|-----------|---------|-----|
| `sla-monitor` | Мониторинг SLA | - | ✓ |

## Конфигурация JWT (supabase/config.toml)

```toml
# Публичные эндпоинты (verify_jwt = false)
[functions.telegram-webhook]
verify_jwt = false

[functions.whatsapp-webhook]
verify_jwt = false

[functions.wappi-whatsapp-webhook]
verify_jwt = false

[functions.wpp-webhook]
verify_jwt = false

[functions.max-webhook]
verify_jwt = false

[functions.salebot-webhook]
verify_jwt = false

[functions.tbank-webhook]
verify_jwt = false

[functions.onlinepbx-webhook]
verify_jwt = false

[functions.sitemap]
verify_jwt = false

[functions.lesson-reminders]
verify_jwt = false

[functions.webhook-proxy]
verify_jwt = false

[functions.salebot-stop]
verify_jwt = false
```

## Деплой команды

```bash
# Деплой всех функций
supabase functions deploy

# Деплой конкретной функции
supabase functions deploy send-push-notification

# Деплой с секретами
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set VAPID_PUBLIC_KEY=...
supabase secrets set VAPID_PRIVATE_KEY=...
```
