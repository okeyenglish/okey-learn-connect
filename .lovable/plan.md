

## Оптимизация: Убрать account из query string

### Текущее состояние
- Webhook URL: `https://api.academyos.ru/functions/v1/wpp-webhook?account=0000000000002`
- `wpp-webhook` уже поддерживает fallback: `event.data?.account || accountFromQuery` (строка 83)

### Изменения

**`supabase/functions/wpp-create/index.ts`**

Строка 139 - убрать `?account=`:
```typescript
// До:
const webhookUrl = `${SELF_HOSTED_URL}/functions/v1/wpp-webhook?account=${settings.wppAccountNumber}`;

// После:
const webhookUrl = `${SELF_HOSTED_URL}/functions/v1/wpp-webhook`;
```

Строка 247 - убрать `?account=`:
```typescript
// До:
const webhookUrl = `${SELF_HOSTED_URL}/functions/v1/wpp-webhook?account=${newClient.session}`;

// После:
const webhookUrl = `${SELF_HOSTED_URL}/functions/v1/wpp-webhook`;
```

### Почему это безопасно
`wpp-webhook` уже получает `account` из body:
```typescript
const account = event.data?.account || accountFromQuery
```

WPP Platform передаёт `account` в `data.account` при каждом событии.

### После деплоя
```bash
rsync -avz ./supabase/functions/wpp-create/ root@185.23.35.9:/home/automation/supabase-project/volumes/functions/wpp-create/
docker compose restart functions

# Перерегистрировать webhook с новым URL (без ?account=)
```

