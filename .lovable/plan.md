
# План: Обработка вебхуков T-Bank и отображение платежей в диалоге клиента

## Проблема

Вебхук T-Bank (`https://api.academyos.ru/functions/v1/tbank-webhook`) настроен в функции, но:

1. **События от T-Bank возможно не доходят или не обрабатываются** — нет логов в функции
2. **При успешной оплате не создаётся сообщение в чат клиента** — логика создаёт только запись в таблице `payments`, но не уведомляет CRM-интерфейс
3. **В диалоге клиента не видно факта оплаты** — нужно создавать сообщение типа "payment_confirmed" или использовать формат `xxx_success СУММА`, который уже поддерживает `SalebotCallbackMessage`

## Решение

### Шаг 1: Добавить логирование в webhook_logs

Добавить запись в `webhook_logs` при получении любого события от T-Bank для диагностики:

```text
webhook_logs.insert({
  messenger_type: 'tbank',
  event_type: 'webhook_received',
  webhook_data: notification,
  processed: false
})
```

### Шаг 2: Создавать сообщение в чате клиента при успешной оплате

При статусе `CONFIRMED` и `Success=true`:

1. Найти `client_id` из `online_payments`
2. Создать сообщение в `chat_messages` с форматом, понятным `SalebotCallbackMessage`:
   - Формат: `tbank_success СУММА` (например, `tbank_success 11990`)
   - Или использовать простой текстовый формат с иконкой

```text
chat_messages.insert({
  client_id: onlinePayment.client_id,
  organization_id: onlinePayment.organization_id,
  content: `tbank_success ${amount}`,
  message_type: 'system',
  direction: 'incoming',
  messenger: 'system',
  status: 'delivered'
})
```

### Шаг 3: Обновить SalebotCallbackMessage

Расширить регулярное выражение `SUCCESS_PAYMENT_REGEX` для поддержки формата `tbank_success СУММА`:

```typescript
// Было:
const SUCCESS_PAYMENT_REGEX = /^[a-z0-9]+_success\s+(\d+)$/i;

// Останется таким же, так как tbank_success 11990 уже соответствует паттерну
```

Паттерн уже поддерживает любой префикс `[a-z0-9]+_success`, включая `tbank_success`.

### Шаг 4: Добавить поддержку client_id в логику вебхука

Проверить связь `online_payments.client_id` (добавлено миграцией `20260119111814`) и использовать его для создания сообщения.

## Технические изменения

### Файл: `supabase/functions/tbank-webhook/index.ts`

1. Добавить логирование в `webhook_logs` в начале обработки
2. После успешного платежа (`CONFIRMED` + `Success`) — создать сообщение в `chat_messages` для клиента
3. Пометить `webhook_logs` как обработанный

```text
// Добавить в начало после парсинга notification:
await supabase.from('webhook_logs').insert({
  messenger_type: 'tbank',
  event_type: notification.Status || 'unknown',
  webhook_data: notification,
  processed: false
});

// Добавить после создания payment (при CONFIRMED):
if (onlinePayment.client_id) {
  const amountRub = onlinePayment.amount / 100;
  await supabase.from('chat_messages').insert({
    client_id: onlinePayment.client_id,
    organization_id: onlinePayment.organization_id,
    content: `tbank_success ${amountRub}`,
    message_type: 'system',
    direction: 'incoming',
    messenger: 'system',
    status: 'delivered'
  });
  
  // Обновить last_message_at у клиента
  await supabase.from('clients')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', onlinePayment.client_id);
}

// Пометить лог как обработанный
await supabase.from('webhook_logs')
  .update({ processed: true })
  .eq('webhook_data->>OrderId', notification.OrderId);
```

### Файл: `src/components/crm/SalebotCallbackMessage.tsx`

Добавить специфичную обработку для T-Bank платежей с более красивым отображением:

```typescript
// Добавить в CALLBACK_CONFIG:
const CALLBACK_CONFIG = {
  // ... существующие
  tbank_payment: { label: 'Онлайн-оплата Т-Банк', icon: CreditCard, color: 'text-green-600' },
};

// Обновить логику для распознавания tbank_success
const TBANK_SUCCESS_REGEX = /^tbank_success\s+(\d+(?:\.\d+)?)$/i;

// В компоненте проверять этот паттерн и показывать красивое сообщение
```

## Что нужно проверить на self-hosted

После деплоя на self-hosted (`api.academyos.ru`):

1. **Убедиться что T-Bank отправляет вебхуки** — проверить настройки в личном кабинете T-Bank, URL должен быть `https://api.academyos.ru/functions/v1/tbank-webhook`
2. **Проверить логи в базе** — `SELECT * FROM webhook_logs WHERE messenger_type = 'tbank' ORDER BY created_at DESC LIMIT 10`
3. **Проверить что client_id заполняется** при создании online_payment через `tbank-init-client`

## Результат

После реализации:
- Все входящие вебхуки от T-Bank логируются в `webhook_logs` для диагностики
- При успешной оплате в диалоге клиента появляется сообщение "Успешная оплата на X₽"
- Сообщение отображается в красивом формате (зелёная иконка + сумма)
- Клиент "поднимается" в списке диалогов (обновляется `last_message_at`)
