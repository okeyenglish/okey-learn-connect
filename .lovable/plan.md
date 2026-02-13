
## Диагностика: оплата Т-Банк не фиксируется в чатах

### Найденная проблема

Edge function `tbank-webhook` подключается к **Lovable Cloud базе** вместо self-hosted. На строке 39-41:

```text
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;  // <-- Lovable Cloud!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);
```

Все остальные webhook-функции (salebot, telegram, whatsapp) используют `createSelfHostedSupabaseClient()` из `_shared/types.ts`, который подключается к `api.academyos.ru`. Только `tbank-webhook` этого не делает.

В результате:
- Поиск `online_payments` идёт в Lovable Cloud (таблица не существует) -- функция падает
- `has_pending_payment` никогда не обновляется
- Системное сообщение в чат не создаётся
- Чат не закрепляется с зелёным фоном

### План исправления

**Один файл, одно изменение:**

В `supabase/functions/tbank-webhook/index.ts` заменить ручное создание клиента на `createSelfHostedSupabaseClient`:

1. Добавить импорт `createSelfHostedSupabaseClient` из `_shared/types.ts`
2. Заменить строки 39-41 на вызов `createSelfHostedSupabaseClient(createClient)` -- это направит все запросы на `api.academyos.ru`

После этого вся цепочка будет работать:
- Webhook находит `online_payments` на self-hosted
- Верифицирует токен через `payment_terminals`
- Обновляет `has_pending_payment = true` в `clients`
- Создаёт системное сообщение в `chat_messages`
- Отправляет "спасибо" клиенту через мессенджер

Дополнительных миграций и изменений фронтенда не требуется -- всё уже реализовано и читает данные с self-hosted.
