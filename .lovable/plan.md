
# Диагностика: Почему сообщение клиенту не отправляется после оплаты

## Обнаруженные проблемы

Проанализировав код `tbank-webhook/index.ts` и связанных Edge Functions (`wpp-send`, `whatsapp-send`), я обнаружил **4 критических проблемы**:

### Проблема 1: Авторизация через user JWT вместо service role

**wpp-send** требует авторизацию через JWT токен пользователя (строки 46-56):

```typescript
const { data: { user } } = await supabase.auth.getUser(token)
if (userError || !user) {
  return errorResponse('Unauthorized', 401)  // ← Сюда падает запрос
}
```

**tbank-webhook** передаёт `SUPABASE_SERVICE_ROLE_KEY`:

```typescript
'Authorization': `Bearer ${supabaseKey}`,  // supabaseKey = service_role_key
```

Service role key **не проходит** через `auth.getUser()` - это ключ для прямого доступа к базе, а не JWT токен пользователя. Функция wpp-send возвращает `401 Unauthorized`.

### Проблема 2: Несоответствие имён полей в запросе

| tbank-webhook отправляет | wpp-send ожидает | whatsapp-send ожидает |
|--------------------------|------------------|----------------------|
| `phone` | `phoneNumber` | `phoneNumber` |
| `client_id` | `clientId` | `clientId` |
| `message` | `message` ✓ | `message` ✓ |

### Проблема 3: Несоответствие полей фильтрации интеграций

| Функция | Поле фильтра |
|---------|--------------|
| `wpp-send` | `is_active` |
| `whatsapp-send` | `is_enabled` |
| `tbank-webhook` | `is_enabled` |

Таблица `messenger_integrations` скорее всего использует `is_enabled`, поэтому `wpp-send` не находит интеграцию.

### Проблема 4: whatsapp-send требует clientId

```typescript
// whatsapp-send, строка 200-201
if (!clientId) {
  return errorResponse('clientId is required', 400);
}
```

Но tbank-webhook отправляет `client_id` (snake_case).

---

## План исправления

### Шаг 1: Исправить tbank-webhook - правильные имена параметров

Изменить формат запроса с snake_case на camelCase:

```typescript
body: JSON.stringify({
  clientId: onlinePayment.client_id,      // было: client_id
  phoneNumber: clientData.phone,           // было: phone
  message: thankYouMessage,
  organizationId: onlinePayment.organization_id,
}),
```

### Шаг 2: Исправить wpp-send - поддержка service role авторизации

Добавить bypass для вызовов от других Edge Functions (с service role key):

```typescript
// wpp-send - в начале функции
const authHeader = req.headers.get('Authorization')
if (!authHeader) {
  return errorResponse('Missing authorization header', 401)
}

const token = authHeader.replace('Bearer ', '')
let orgId: string | null = null

// Попробуем получить пользователя через JWT
const { data: { user }, error: userError } = await supabase.auth.getUser(token)

if (user && !userError) {
  // Авторизация через JWT пользователя
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  orgId = profile?.organization_id
} else {
  // Fallback: organization_id из body (для вызовов от tbank-webhook)
  const payload = await req.json()
  orgId = payload.organizationId || payload.organization_id
}

if (!orgId) {
  return errorResponse('Organization not found', 404)
}
```

### Шаг 3: Исправить wpp-send - использовать is_enabled вместо is_active

```typescript
// Заменить во всех местах
.eq('is_active', true)
// на
.eq('is_enabled', true)
```

### Шаг 4: (Опционально) Добавить поддержку MAX мессенджера

Добавить обработку `messengerType === 'max'` в tbank-webhook для отправки сообщений через MAX.

---

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `supabase/functions/tbank-webhook/index.ts` | Исправить имена параметров (clientId, phoneNumber) |
| `supabase/functions/wpp-send/index.ts` | Добавить fallback авторизации + заменить is_active на is_enabled |
| `supabase/functions/whatsapp-send/index.ts` | Добавить fallback авторизации для service role вызовов |

---

## Ожидаемый результат

После исправлений:
1. `tbank-webhook` корректно вызовет `wpp-send` или `whatsapp-send`
2. Функции примут запрос с service role авторизацией
3. Сообщение "Оплата на сумму X₽ прошла успешно! Большое спасибо." будет отправлено клиенту в WhatsApp

---

## Действия после деплоя

1. Выполнить синхронизацию Edge Functions на self-hosted сервере
2. Перезапустить контейнер: `docker compose restart functions`
3. Протестировать оплату и проверить логи: `docker compose logs functions | grep tbank`
