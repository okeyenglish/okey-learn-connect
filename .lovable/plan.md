# План: Интеграция с WPP Platform — ВЫПОЛНЕНО ✅

## Архитектура (server-to-server с WPP_SECRET)

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Пользователь → Edge Function                                        │
│ Authorization: Bearer <SUPABASE_JWT>                                │
│ Edge Function проверяет JWT через self-hosted Supabase              │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Edge Function → WPP Platform (server-to-server)                     │
│ POST /api/integrations/wpp/create                                   │
│ Authorization: Bearer <WPP_SECRET>                                  │
│ Body: { organizationId }                                            │
│ → { apiKey, session, status }                                       │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Далее используется per-org apiKey для JWT                           │
│ POST /auth/token { apiKey } → { token }                             │
│ Все запросы: Authorization: Bearer <JWT>                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Выполненные изменения

### 1. `supabase/functions/_shared/wpp.ts`
- ✅ `createClient(baseUrl, wppSecret, organizationId)` — теперь использует WPP_SECRET

### 2. `supabase/functions/wpp-create/index.ts`
- ✅ Проверяет пользователя через Supabase JWT
- ✅ Вызывает WPP Platform с `WPP_SECRET` + `organizationId`

### 3. `supabase/functions/wpp-provision/index.ts`
- ✅ Аналогичные изменения

## Требования к WPP Platform

WPP Platform должен принимать:
```
POST /api/integrations/wpp/create
Authorization: Bearer <WPP_SECRET>
Content-Type: application/json

{ "organizationId": "uuid-of-organization" }
```

И возвращать:
```json
{
  "apiKey": "key_xxxxx",
  "session": "client_xxx",
  "status": "starting"
}
```

## Требования к деплою (self-hosted)

```bash
rsync -avz ./supabase/functions/_shared/wpp.ts automation@api.academyos.ru:/path/to/functions/_shared/
rsync -avz ./supabase/functions/wpp-create/index.ts automation@api.academyos.ru:/path/to/functions/wpp-create/
rsync -avz ./supabase/functions/wpp-provision/index.ts automation@api.academyos.ru:/path/to/functions/wpp-provision/

docker compose restart functions
```
