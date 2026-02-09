
# Исправление Smart Routing для Telegram: добавление колонки integration_id

## Проблема

При отправке ответа клиенту или преподавателю система выбирает **неправильную интеграцию** (Telegram аккаунт). Вместо того чтобы ответить с аккаунта, на который написал клиент, система использует `is_primary=true` аккаунт, что приводит к ошибке отправки (красный индикатор).

## Причина

Колонка `integration_id` **отсутствует** в таблице `chat_messages` — как на Cloud, так и на self-hosted базе:

```
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'chat_messages';
-- integration_id NOT FOUND
```

Без этой колонки:
1. Webhook не может сохранить информацию о том, с какого аккаунта пришло сообщение
2. `telegram-send` не может найти правильную интеграцию для ответа
3. Система всегда использует primary интеграцию

## Решение

### Шаг 1: Добавить колонку в Cloud базу (миграция)

```sql
-- Добавить колонку integration_id для smart routing
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS integration_id uuid;

-- Индекс для ускорения smart routing запросов
CREATE INDEX IF NOT EXISTS idx_chat_messages_integration_id 
ON public.chat_messages(integration_id) 
WHERE integration_id IS NOT NULL;

-- Комментарий для документации
COMMENT ON COLUMN public.chat_messages.integration_id IS 
'ID интеграции мессенджера для smart routing - определяет какой аккаунт использовать для ответа';
```

### Шаг 2: Обновить resilientInsertMessage в telegram-webhook

Добавить `integration_id` в минимальный payload fallback:

```typescript
const minimalPayload: Record<string, any> = {
  client_id: payload.client_id || null,
  organization_id: payload.organization_id,
  message_text: payload.message_text || '[Сообщение]',
  message_type: payload.message_type || 'client',
  messenger_type: payload.messenger_type || 'telegram',
  is_outgoing: payload.is_outgoing ?? false,
  is_read: payload.is_read ?? false,
  external_message_id: payload.external_message_id || null,
  file_url: payload.file_url || null,
  file_name: payload.file_name || null,
  file_type: payload.file_type || null,
  // ДОБАВИТЬ:
  integration_id: payload.integration_id || null,
};
```

### Шаг 3: Сгенерировать SQL для self-hosted

Создать документ `docs/add_integration_id_column.sql` с миграцией для ручного выполнения на self-hosted сервере.

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| Cloud Database | Миграция: добавить колонку `integration_id` |
| `supabase/functions/telegram-webhook/index.ts` | Добавить `integration_id` в минимальный payload |
| `docs/add_integration_id_column.sql` | SQL скрипт для self-hosted |

## Ожидаемый результат

После исправления:
1. Входящие сообщения сохраняются с `integration_id` — ID конкретного Telegram аккаунта
2. При ответе `telegram-send` находит этот ID и использует нужную интеграцию
3. Сообщение доставляется клиенту с правильного аккаунта (зелёная галочка)
4. Smart routing работает для клиентов и преподавателей

## Примечание для self-hosted

После применения изменений в Cloud нужно выполнить миграцию на self-hosted:

```bash
psql -U postgres -d your_database -f docs/add_integration_id_column.sql
```
