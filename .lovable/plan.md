

# План исправления: Edge Function должна подключаться к self-hosted базе

## Обнаруженная проблема

Менеджеры не видят клиентов, потому что Edge Function `get-user-branches`:

1. **Работает в Lovable Cloud** — но подключается к базе Lovable Cloud (`SUPABASE_URL`)
2. **Таблицы `manager_branches` и `profiles` находятся на self-hosted** (`api.academyos.ru`)
3. В Lovable Cloud этих таблиц нет → функция всегда возвращает `{ branches: [], source: "none" }`
4. Результат: `hasRestrictions = false` → менеджеры должны видеть всех, НО из-за строгой фильтрации (`if (!clientBranch) return false`) они не видят никого

## Решение

Изменить Edge Function `get-user-branches` чтобы она подключалась к **self-hosted базе данных** (как делает `task-reminders`).

---

## Техническая реализация

### Изменения в `supabase/functions/get-user-branches/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Self-hosted configuration (manager_branches & profiles are stored there)
const SELF_HOSTED_URL = 'https://api.academyos.ru';
const SELF_HOSTED_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY5MDg4ODgzLCJleHAiOjE5MjY3Njg4ODN9.WEsCyaCdQvxzVObedC-A9hWTJUSwI_p9nCG1wlbaNEg';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Connect to SELF-HOSTED database (not Lovable Cloud)
    const supabase = createClient(SELF_HOSTED_URL, SELF_HOSTED_ANON_KEY)

    const { user_id } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[get-user-branches] Fetching branches for user from SELF-HOSTED:', user_id)

    // ... остальная логика без изменений
  }
})
```

### Что изменится

| До | После |
|---|---|
| Подключение к Lovable Cloud (`SUPABASE_URL`) | Подключение к self-hosted (`api.academyos.ru`) |
| Таблицы `manager_branches` не существуют | Таблицы доступны |
| Всегда возвращает `[]` | Возвращает реальные филиалы менеджера |

---

## Шаги реализации

1. **Обновить Edge Function** — заменить подключение к Lovable Cloud на self-hosted
2. **Задеплоить функцию** — она обновится автоматически
3. **Протестировать** — войти под менеджером Новокосино и проверить что он видит только клиентов своего филиала

---

## Ожидаемый результат

- Менеджер Новокосино увидит только клиентов с филиалом "Новокосино" / "O'KEY ENGLISH Новокосино"
- Админы продолжат видеть всех клиентов
- Менеджеры с несколькими филиалами увидят клиентов из всех назначенных филиалов

