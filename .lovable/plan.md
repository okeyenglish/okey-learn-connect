

## План: Исправление webhook URL для входящих WPP сообщений

### Проблема
Webhook регистрируется с URL Lovable Cloud вместо self-hosted:
- **Текущий**: `https://igqdjqmohwsgyeuhitqg.supabase.co/functions/v1/wpp-webhook`
- **Нужный**: `https://api.academyos.ru/functions/v1/wpp-webhook`

### Решение
Добавить переменную `SELF_HOSTED_URL` и использовать её в `wpp-create`.

### Технические изменения

**1. Добавить секрет `SELF_HOSTED_URL`**
Значение: `https://api.academyos.ru`

**2. Изменить `supabase/functions/wpp-create/index.ts`**

Строки 137-139 (для существующих интеграций):
```typescript
// Build webhook URL using self-hosted URL for production
const SELF_HOSTED_URL = Deno.env.get('SELF_HOSTED_URL') || Deno.env.get('SUPABASE_URL');
const webhookUrl = `${SELF_HOSTED_URL}/functions/v1/wpp-webhook?account=${settings.wppAccountNumber}`;
```

Строки 245-247 (для новых интеграций):
```typescript
// Build webhook URL using self-hosted URL
const SELF_HOSTED_URL = Deno.env.get('SELF_HOSTED_URL') || Deno.env.get('SUPABASE_URL');
const webhookUrl = `${SELF_HOSTED_URL}/functions/v1/wpp-webhook?account=${newClient.session}`;
```

### Шаги реализации

1. Добавить секрет `SELF_HOSTED_URL` = `https://api.academyos.ru`
2. Обновить `wpp-create/index.ts`
3. Скопировать на сервер и перезапустить functions
4. Перерегистрировать webhook:
   - Либо вызвать wpp-create с `force_recreate: true`
   - Либо вручную через WPP Platform API

### Альтернатива: Ручная регистрация webhook

Если не хотите менять код, можно зарегистрировать webhook вручную на WPP Platform:

```bash
curl -X POST "https://msg.academyos.ru/internal/session/0000000000002/webhook" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"url": "https://api.academyos.ru/functions/v1/wpp-webhook?account=0000000000002"}'
```

### Проверка после деплоя

1. Отправить тестовое сообщение на WhatsApp
2. Проверить логи: `docker compose logs functions --tail 50 | grep wpp-webhook`
3. Должно появиться: `[wpp-webhook] Received event: message.incoming`

### Ожидаемый результат
- Входящие сообщения будут приходить на `api.academyos.ru`
- Функция `wpp-webhook` сохранит их в `chat_messages`
- Сообщения появятся в CRM

