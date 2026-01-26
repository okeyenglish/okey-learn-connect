

# План: Миграция всех запросов на Self-Hosted Supabase

## Проблема

Обнаружены 4 файла, которые используют переменные окружения Lovable Cloud (`VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`) вместо self-hosted инстанса `api.academyos.ru`:

| Файл | Проблема |
|------|----------|
| `SystemMonitor.tsx` | REST API запросы к `schema_migrations` и `edge_function_health_logs` |
| `SystemMonitorPanel.tsx` | Аналогичные REST API запросы |
| `QRScanner.tsx` | Вызов edge function `qr-login-confirm` |
| `MyApps.tsx` | URL для storage bucket `apps` |

## Решение

Создать централизованные константы и заменить все использования Lovable Cloud переменных на self-hosted конфигурацию.

---

## Шаги реализации

### Шаг 1: Создать константы в `selfHostedApi.ts`

Добавить экспортируемые константы для URL и ключа self-hosted инстанса:

```typescript
export const SELF_HOSTED_URL = "https://api.academyos.ru";
export const SELF_HOSTED_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
export const SELF_HOSTED_API = "https://api.academyos.ru/functions/v1";
```

### Шаг 2: Исправить `SystemMonitor.tsx`

Заменить:
```typescript
// Было:
`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/...`
'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY

// Станет:
`${SELF_HOSTED_URL}/rest/v1/...`
'apikey': SELF_HOSTED_ANON_KEY
```

### Шаг 3: Исправить `SystemMonitorPanel.tsx`

Аналогичная замена REST API запросов на self-hosted URL.

### Шаг 4: Исправить `QRScanner.tsx`

Заменить вызов edge function:
```typescript
// Было:
`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/qr-login-confirm`
'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY

// Станет - использовать selfHostedPost:
import { selfHostedPost } from '@/lib/selfHostedApi';
const response = await selfHostedPost('qr-login-confirm', { token, session });
```

### Шаг 5: Исправить `MyApps.tsx`

Заменить storage URL:
```typescript
// Было:
`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/apps/...`

// Станет:
`${SELF_HOSTED_URL}/storage/v1/object/public/apps/...`
```

---

## Изменяемые файлы

| Файл | Изменения |
|------|-----------|
| `src/lib/selfHostedApi.ts` | Добавить `SELF_HOSTED_URL` и `SELF_HOSTED_ANON_KEY` константы |
| `src/pages/SystemMonitor.tsx` | Заменить `VITE_SUPABASE_*` на self-hosted константы |
| `src/components/admin/SystemMonitorPanel.tsx` | Заменить `VITE_SUPABASE_*` на self-hosted константы |
| `src/components/mobile/QRScanner.tsx` | Использовать `selfHostedPost` вместо raw fetch |
| `src/components/teacher/apps/MyApps.tsx` | Использовать `SELF_HOSTED_URL` для storage |

---

## Техническая информация

**Self-hosted конфигурация:**
- URL: `https://api.academyos.ru`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY5MDg4ODgzLCJleHAiOjE5MjY3Njg4ODN9.WEsCyaCdQvxzVObedC-A9hWTJUSwI_p9nCG1wlbaNEg`

**Lovable Cloud (НЕ использовать):**
- URL: `https://igqdjqmohwsgyeuhitqg.supabase.co`
- Anon Key: из `VITE_SUPABASE_ANON_KEY`

---

## Результат

После внесения изменений:
- Все REST API запросы будут идти на `api.academyos.ru`
- Все edge functions будут вызываться через self-hosted
- Storage URLs будут указывать на self-hosted bucket
- Единая точка конфигурации в `selfHostedApi.ts`

