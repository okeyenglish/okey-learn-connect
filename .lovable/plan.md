# План: Интеграция с WPP Platform — ВЫПОЛНЕНО ✅

## Исправленная архитектура

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
│ ЭТАП 2: Получение JWT (автоматически в WppMsgClient)                │
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

## Выполненные изменения

### 1. `supabase/functions/_shared/wpp.ts`
- ❌ Удалён метод `createApiKey()` с неправильным эндпоинтом `/auth/keys`
- ✅ Добавлен метод `createClient()` — вызывает `/api/integrations/wpp/create` с Supabase JWT

### 2. `supabase/functions/wpp-create/index.ts`
- ✅ Убрана зависимость от `WPP_API_KEY`
- ✅ Используется `WppMsgClient.createClient(WPP_BASE_URL, userJwt)` — передаёт JWT пользователя напрямую в WPP Platform

### 3. `supabase/functions/wpp-provision/index.ts`
- ✅ Аналогичные изменения — теперь использует `createClient()` с Supabase JWT

## Требования к деплою

После изменений необходимо обновить файлы на self-hosted сервере:

```bash
# Скопировать обновленные файлы
rsync -avz ./supabase/functions/_shared/wpp.ts automation@api.academyos.ru:/path/to/functions/_shared/
rsync -avz ./supabase/functions/wpp-create/index.ts automation@api.academyos.ru:/path/to/functions/wpp-create/
rsync -avz ./supabase/functions/wpp-provision/index.ts automation@api.academyos.ru:/path/to/functions/wpp-provision/

# Перезапустить functions
docker compose restart functions
```
