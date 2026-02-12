

## Исправление отображения статусов сообщений GreenAPI WhatsApp

### Проблема

Функция `handleMessageStatus` в `whatsapp-webhook` имеет две проблемы:

1. **Неправильное чтение данных**: Код читает статус из `statusData.idMessage` и `statusData.status`, но по документации Green API поля `idMessage` и `status` находятся на **корневом уровне** вебхука (не внутри вложенного объекта)
2. **Нет fallback для self-hosted**: При отсутствии колонки `message_status` в self-hosted базе обновление молча падает и статус теряется
3. **Нет маппинга специальных статусов**: `noAccount` и `notInGroup` не маппятся на понятные статусы

### Решение

#### 1. `supabase/functions/whatsapp-webhook/index.ts` -- переписать `handleMessageStatus`

- Читать `idMessage` и `status` с корневого уровня вебхука (с фоллбэком на `statusData` для обратной совместимости)
- Добавить маппинг статусов: `sent`, `delivered`, `read`, `failed`, `noAccount` -> `failed`, `notInGroup` -> `failed`
- Добавить resilient fallback: при ошибке с колонкой `message_status` сохранять в `metadata.message_status` (аналогично тому что уже сделано для `telegram-webhook`)

#### 2. `supabase/functions/_shared/types.ts` -- обновить тип `GreenAPIStatusData`

- Добавить опциональное поле `description` для описания ошибки (документация GreenAPI включает его для статусов `noAccount`, `notInGroup`)

### Детали реализации

```text
handleMessageStatus(webhook):
  1. messageId = webhook.idMessage || webhook.statusData?.idMessage
  2. status = webhook.status || webhook.statusData?.status
  3. Map status -> { sent, delivered, read, failed, noAccount->failed, notInGroup->failed }
  4. UPDATE chat_messages SET message_status = mapped WHERE external_message_id = messageId
  5. If error contains "column does not exist":
     a. SELECT id, metadata FROM chat_messages WHERE external_message_id = messageId
     b. UPDATE metadata = { ...existing, message_status: mapped }
```

### Файлы для изменения

- `supabase/functions/whatsapp-webhook/index.ts` -- переписать функцию `handleMessageStatus` (~25 строк)
- `supabase/functions/_shared/types.ts` -- добавить поле `description` в `GreenAPIStatusData`

