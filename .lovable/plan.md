

## План: Сохранение и использование JWT токена напрямую

### Текущая проблема

Сейчас при каждом запросе к WPP Platform (QR, статус) код:
1. Берёт `apiKey` из `messenger_integrations.settings.wppApiKey`
2. Делает запрос `POST /auth/token { apiKey }` для получения JWT
3. Использует JWT для авторизации запроса

Если `apiKey` устарел или невалиден, получаем `401 Invalid token`.

### Решение

Сохранять JWT токен сразу после создания клиента и использовать его напрямую без дополнительного запроса `/auth/token`.

### Архитектура

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                   СОЗДАНИЕ КЛИЕНТА (wpp-create)                        │
├─────────────────────────────────────────────────────────────────────────┤
│  1. POST /api/integrations/wpp/create (с WPP_SECRET)                   │
│     → получаем apiKey, session                                         │
│                                                                         │
│  2. POST /auth/token { apiKey }                                        │
│     → получаем JWT token                                               │
│                                                                         │
│  3. Сохраняем в messenger_integrations.settings:                       │
│     - wppApiKey                                                        │
│     - wppAccountNumber                                                 │
│     - wppJwtToken        ← НОВОЕ                                       │
│     - wppJwtExpiresAt    ← НОВОЕ                                       │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                   ЗАПРОСЫ (wpp-qr, wpp-status)                         │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Читаем settings из messenger_integrations                          │
│                                                                         │
│  2. Если wppJwtToken есть И не истёк:                                  │
│     → используем напрямую (без /auth/token)                            │
│                                                                         │
│  3. Если токен истёк:                                                  │
│     → получаем новый через POST /auth/token { apiKey }                 │
│     → обновляем в базе                                                 │
│                                                                         │
│  4. Делаем запрос с Authorization: Bearer <JWT>                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Изменения в коде

#### 1. `supabase/functions/_shared/wpp.ts`

Добавить альтернативный конструктор с прямым JWT:

```typescript
export interface WppMsgClientOptions {
  baseUrl: string;
  apiKey?: string;      // Для получения JWT
  jwtToken?: string;    // Прямой JWT (приоритет)
  jwtExpiresAt?: number; // Unix timestamp истечения
  timeoutMs?: number;
}
```

Обновить метод `getToken()`:
- Если передан `jwtToken` и он не истёк - вернуть его
- Иначе получить новый через `apiKey`
- Вернуть callback для обновления токена в базе

Добавить статический метод для получения JWT после создания клиента:

```typescript
static async getInitialToken(baseUrl: string, apiKey: string): Promise<{token: string, expiresAt: number}>
```

#### 2. `supabase/functions/wpp-create/index.ts`

После создания клиента:
1. Сразу получить JWT через `WppMsgClient.getInitialToken()`
2. Сохранить в settings: `wppJwtToken`, `wppJwtExpiresAt`

```typescript
const newClient = await WppMsgClient.createClient(WPP_BASE_URL, WPP_SECRET, orgId);

// Получить JWT сразу
const { token, expiresAt } = await WppMsgClient.getInitialToken(WPP_BASE_URL, newClient.apiKey);

const newSettings = {
  wppApiKey: newClient.apiKey,
  wppAccountNumber: newClient.session,
  wppJwtToken: token,           // ← НОВОЕ
  wppJwtExpiresAt: expiresAt,   // ← НОВОЕ
};
```

#### 3. `supabase/functions/wpp-qr/index.ts`

Использовать сохранённый JWT:

```typescript
const settings = integration.settings as Record<string, any>;

// Проверить есть ли валидный JWT
let jwtToken = settings.wppJwtToken;
let jwtExpiresAt = settings.wppJwtExpiresAt;

const isTokenValid = jwtToken && jwtExpiresAt && Date.now() < jwtExpiresAt - 60000;

const wpp = new WppMsgClient({
  baseUrl: WPP_BASE_URL,
  apiKey: settings.wppApiKey,
  jwtToken: isTokenValid ? jwtToken : undefined,
  jwtExpiresAt: isTokenValid ? jwtExpiresAt : undefined,
});

// Если токен обновился - сохранить в базу
const newToken = await wpp.getToken();
if (newToken !== jwtToken) {
  await supabaseClient
    .from('messenger_integrations')
    .update({
      settings: { ...settings, wppJwtToken: newToken, wppJwtExpiresAt: wpp.tokenExpiry }
    })
    .eq('id', integration.id);
}
```

#### 4. `supabase/functions/wpp-status/index.ts`

Аналогичные изменения для использования сохранённого JWT.

### Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `supabase/functions/_shared/wpp.ts` | Добавить поддержку прямого JWT, метод `getInitialToken()` |
| `supabase/functions/wpp-create/index.ts` | Сохранять JWT после создания клиента |
| `supabase/functions/wpp-qr/index.ts` | Использовать сохранённый JWT |
| `supabase/functions/wpp-status/index.ts` | Использовать сохранённый JWT |

### Результат

- QR-код будет отображаться без ошибок `401 Invalid token`
- Меньше запросов к WPP Platform (не нужен `/auth/token` каждый раз)
- Автоматическое обновление JWT при истечении

