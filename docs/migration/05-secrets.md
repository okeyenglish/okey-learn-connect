# Secrets (34 шт.)

> ⚠️ Значения секретов НЕ хранятся в этом файле!  
> Получите их из Supabase Dashboard → Settings → Edge Functions → Secrets

## Список секретов

### 🔔 Push Notifications (2)

| Секрет | Описание | Где получить |
|--------|----------|--------------|
| `VAPID_PUBLIC_KEY` | Публичный ключ Web Push | Генерируется: `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Приватный ключ Web Push | Генерируется вместе с публичным |

### 🤖 AI / OpenAI (2)

| Секрет | Описание | Где получить |
|--------|----------|--------------|
| `OPENAI_API_KEY` | API ключ OpenAI | https://platform.openai.com/api-keys |
| `OPENROUTER_PROVISIONING_KEY` | Ключ OpenRouter | https://openrouter.ai/keys |

### 💬 WhatsApp - Green API (2)

| Секрет | Описание | Где получить |
|--------|----------|--------------|
| `GREEN_API_ID_INSTANCE` | ID инстанса Green API | https://green-api.com/cabinet |
| `GREEN_API_TOKEN_INSTANCE` | Токен инстанса | https://green-api.com/cabinet |

### 💬 WhatsApp - WPP Connect (2)

| Секрет | Описание | Где получить |
|--------|----------|--------------|
| `WPP_HOST` | URL WPP сервера | Ваш self-hosted WPP |
| `WPP_SECRET` | Секрет WPP | Конфиг WPP сервера |

### 📱 Telegram - Wappi (1)

| Секрет | Описание | Где получить |
|--------|----------|--------------|
| `WAPPI_API_TOKEN` | API токен Wappi | https://wappi.pro/cabinet |

### 🤖 Salebot (1)

| Секрет | Описание | Где получить |
|--------|----------|--------------|
| `SALEBOT_API_KEY` | API ключ Salebot | https://salebot.pro/cabinet |

### 📊 SEO - Yandex (5)

| Секрет | Описание | Где получить |
|--------|----------|--------------|
| `YANDEX_OAUTH_TOKEN` | OAuth токен Yandex | https://oauth.yandex.ru/ |
| `YANDEX_DIRECT_TOKEN` | Токен Yandex.Direct | https://direct.yandex.ru/registered/main.pl |
| `YANDEX_METRIKA_COUNTER_ID` | ID счётчика Метрики | https://metrika.yandex.ru/ |
| `YANDEX_WEBMASTER_HOST_ID` | ID хоста в Вебмастере | https://webmaster.yandex.ru/ |
| `YANDEX_WEBMASTER_USER_ID` | ID пользователя Вебмастера | API Вебмастера |

### 📊 SEO - Google (2)

| Секрет | Описание | Где получить |
|--------|----------|--------------|
| `GOOGLE_SERVICE_ACCOUNT` | JSON сервисного аккаунта | Google Cloud Console |
| `INDEXNOW_KEY` | Ключ IndexNow | https://www.indexnow.org/ |

### 📧 Email (1)

| Секрет | Описание | Где получить |
|--------|----------|--------------|
| `RESEND_API_KEY` | API ключ Resend | https://resend.com/api-keys |

### 🔐 Supabase (автоматические)

| Секрет | Описание | Где получить |
|--------|----------|--------------|
| `SUPABASE_URL` | URL проекта | Авто в Edge Functions |
| `SUPABASE_ANON_KEY` | Анонимный ключ | Авто в Edge Functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role ключ | Авто в Edge Functions |

### 🔧 Прочие

| Секрет | Описание | Где получить |
|--------|----------|--------------|
| `LOVABLE_API_KEY` | API ключ Lovable | Lovable Dashboard |

## Команды для установки секретов

```bash
# Push notifications
supabase secrets set VAPID_PUBLIC_KEY="..."
supabase secrets set VAPID_PRIVATE_KEY="..."

# AI
supabase secrets set OPENAI_API_KEY="sk-..."
supabase secrets set OPENROUTER_PROVISIONING_KEY="..."

# WhatsApp - Green API
supabase secrets set GREEN_API_ID_INSTANCE="..."
supabase secrets set GREEN_API_TOKEN_INSTANCE="..."

# WhatsApp - WPP
supabase secrets set WPP_HOST="https://..."
supabase secrets set WPP_SECRET="..."

# Telegram - Wappi
supabase secrets set WAPPI_API_TOKEN="..."

# Salebot
supabase secrets set SALEBOT_API_KEY="..."

# Yandex SEO
supabase secrets set YANDEX_OAUTH_TOKEN="..."
supabase secrets set YANDEX_DIRECT_TOKEN="..."
supabase secrets set YANDEX_METRIKA_COUNTER_ID="..."
supabase secrets set YANDEX_WEBMASTER_HOST_ID="..."
supabase secrets set YANDEX_WEBMASTER_USER_ID="..."

# Google SEO
supabase secrets set GOOGLE_SERVICE_ACCOUNT='{"type":"service_account",...}'
supabase secrets set INDEXNOW_KEY="..."

# Email
supabase secrets set RESEND_API_KEY="re_..."

# Lovable
supabase secrets set LOVABLE_API_KEY="..."
```

## Проверка секретов

```bash
# Список всех секретов
supabase secrets list

# Проверить конкретный (выведет masked value)
supabase secrets list | grep OPENAI
```

## Важно!

1. **Не коммитьте секреты в git** - используйте `.env` файлы только локально
2. **Ротируйте ключи** после миграции для безопасности
3. **Проверьте лимиты** API ключей после переезда
