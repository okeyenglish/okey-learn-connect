# Webhooks и внешние интеграции

> Webhooks уже настроены на self-hosted инстанс api.academyos.ru

## Текущие Webhook URLs (Self-Hosted)

| Сервис | Endpoint | URL |
|--------|----------|-----|
| Telegram Bot | `telegram-webhook` | `https://api.academyos.ru/functions/v1/telegram-webhook` |
| WhatsApp (Green API) | `whatsapp-webhook` | `https://api.academyos.ru/functions/v1/whatsapp-webhook` |
| WhatsApp (Wappi) | `wappi-whatsapp-webhook` | `https://api.academyos.ru/functions/v1/wappi-whatsapp-webhook` |
| WhatsApp (WPP) | `wpp-webhook` | `https://api.academyos.ru/functions/v1/wpp-webhook` |
| MAX (Telegram alt) | `max-webhook` | `https://api.academyos.ru/functions/v1/max-webhook` |
| Salebot | `salebot-webhook` | `https://api.academyos.ru/functions/v1/salebot-webhook` |
| T-Bank | `tbank-webhook` | `https://api.academyos.ru/functions/v1/tbank-webhook` |
| OnlinePBX | `onlinepbx-webhook` | `https://api.academyos.ru/functions/v1/onlinepbx-webhook` |

## Инструкции по обновлению

### 1. Telegram Bot

1. Откройте @BotFather в Telegram
2. Выберите вашего бота
3. Отправьте: `/setwebhook`
4. Укажите URL: `https://api.academyos.ru/functions/v1/telegram-webhook`

**Или через API:**

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.academyos.ru/functions/v1/telegram-webhook"}'
```

### 2. WhatsApp - Green API

1. Войдите в [Green API Cabinet](https://green-api.com/cabinet)
2. Выберите инстанс
3. Settings → Webhooks
4. Обновите URL на: `https://api.academyos.ru/functions/v1/whatsapp-webhook`

### 3. WhatsApp - Wappi

1. Войдите в [Wappi Cabinet](https://wappi.pro/cabinet)
2. Settings → Webhooks
3. Обновите URL на: `https://api.academyos.ru/functions/v1/wappi-whatsapp-webhook`

### 4. WhatsApp - WPP Connect

Если используете self-hosted WPP:

```bash
# Обновить конфигурацию WPP сервера
# Найти настройки webhook и обновить URL
```

### 5. Salebot

1. Войдите в [Salebot Cabinet](https://salebot.pro) или https://chatter.salebot.pro
2. Настройки бота → API
3. Webhook URL: `https://api.academyos.ru/functions/v1/salebot-webhook`

### 6. T-Bank (Tinkoff)

1. Войдите в [T-Bank Business](https://business.tbank.ru)
2. Интернет-эквайринг → Настройки
3. Notification URL: `https://api.academyos.ru/functions/v1/tbank-webhook`

**Важно:** T-Bank требует HTTPS с валидным сертификатом!

### 7. OnlinePBX

1. Войдите в [OnlinePBX Admin](https://admin.onlinepbx.ru)
2. Настройки → API
3. Webhook URL: `https://api.academyos.ru/functions/v1/onlinepbx-webhook`

## Проверка работы webhooks

### Telegram

```bash
# Проверить статус webhook
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

### Общая проверка

```bash
# Отправить тестовый запрос
curl -X POST "https://api.academyos.ru/functions/v1/telegram-webhook" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## Логирование webhooks

Все входящие webhook-запросы логируются в таблицу `webhook_logs`:

```sql
SELECT * FROM webhook_logs 
ORDER BY created_at DESC 
LIMIT 20;
```

## Troubleshooting

### Webhook не получает запросы

1. Проверить что Edge Function задеплоена: `supabase functions list`
2. Проверить логи: `docker logs supabase-functions | grep webhook`
3. Проверить что домен доступен извне
4. Проверить SSL сертификат

### Ошибка 401 Unauthorized

Webhook-функции должны иметь `verify_jwt = false` в `supabase/config.toml`:

```toml
[functions.telegram-webhook]
verify_jwt = false
```

### Ошибка таймаута

Некоторые сервисы (T-Bank) требуют ответ за 5 секунд. Убедитесь что функция не делает длительных операций синхронно.
