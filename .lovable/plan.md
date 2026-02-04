

# План: Исправление интеграции с WPP Platform

## Корневая проблема

SDK `WppMsgClient` вызывает несуществующий эндпоинт:

```text
Текущий код:        POST /auth/keys { clientId }     ← НЕ СУЩЕСТВУЕТ
Документация WPP:   POST /auth/token { apiKey }      ← только это
```

По документации WPP Platform, API ключи создаются через `/api/integrations/wpp/create`, а не через `/auth/keys`.

## Архитектура по документации

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ЭТАП 1: Создание клиента                                            │
│ POST /api/integrations/wpp/create                                   │
│ Authorization: Bearer <SUPABASE_JWT>                                │
│ → { apiKey, session, status }                                       │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ ЭТАП 2: Получение JWT                                               │
│ POST /auth/token                                                    │
│ Body: { apiKey }                                                    │
│ → { token }                                                         │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ ЭТАП 3+: Все запросы к API                                          │
│ Authorization: Bearer <JWT>                                         │
│ GET /api/accounts/{session}/qr                                      │
│ GET /api/accounts/{session}/status                                  │
│ POST /api/messages/text                                             │
└─────────────────────────────────────────────────────────────────────┘
```

## Изменения

### 1. Исправить `supabase/functions/_shared/wpp.ts`

Убрать метод `createApiKey()` с неправильным эндпоинтом `/auth/keys`.

### 2. Переделать `supabase/functions/wpp-create/index.ts`

Edge function должен вызывать правильный эндпоинт WPP Platform:

```typescript
// ЭТАП 1: Создать клиента на WPP Platform
const createResponse = await fetch(`${WPP_BASE_URL}/api/integrations/wpp/create`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseJwt}`, // Supabase JWT пользователя
  },
});

const { apiKey, session, status } = await createResponse.json();

// Сохранить apiKey в messenger_integrations.settings
```

### 3. Исправить получение JWT

```typescript
// ЭТАП 2: Получить JWT от WPP Platform
const tokenResponse = await fetch(`${WPP_BASE_URL}/auth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ apiKey }),
});

const { token } = await tokenResponse.json();

// ЭТАП 3: Использовать JWT для всех запросов
const qrResponse = await fetch(`${WPP_BASE_URL}/api/accounts/${session}/qr`, {
  headers: { 'Authorization': `Bearer ${token}` },
});
```

### 4. Обновить `WppMsgClient`

```typescript
export class WppMsgClient {
  private apiKey: string;
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  // getToken() - уже правильно реализован (POST /auth/token { apiKey })
  
  // Убрать static createApiKey() - он не нужен
  
  // _fetch() с authRequired - уже правильно использует JWT
}
```

## Вопрос к уточнению

Эндпоинт `/api/integrations/wpp/create` на WPP Platform - это тот же самый эндпоинт, что принимает Supabase JWT? Или это наш Edge Function, который потом вызывает что-то на WPP?

**Варианты:**

**A) WPP Platform имеет свой `/api/integrations/wpp/create`**
- Наш Edge Function просто проксирует запрос туда
- WPP Platform сам создаёт API key и возвращает его

**B) `/api/integrations/wpp/create` - это наш Edge Function**
- Нужен отдельный механизм создания API keys на WPP Platform
- Возможно через админский эндпоинт с `WPP_API_KEY`

Пожалуйста, уточни какой вариант правильный, чтобы я мог создать точный план исправления.

