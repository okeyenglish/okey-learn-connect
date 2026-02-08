
# План: Отображение уведомления об оплате в правильном диалоге

## Проблема

Сообщение об успешной оплате не появляется в диалоге (вкладке WhatsApp), потому что:
1. При создании ссылки на оплату **не сохраняется** информация о том, в каком мессенджере она отправляется
2. Вебхук T-Bank создаёт сообщение с `messenger_type: 'system'`, которое не отображается ни в одной вкладке (WhatsApp/Telegram/Max)
3. Фильтр сообщений: `msg.messengerType === 'whatsapp'` отфильтровывает системные сообщения

## Решение

### Архитектура

```text
┌──────────────────────────────────────────────────────────────────────┐
│                          Фронтенд (CRM)                              │
├──────────────────────────────────────────────────────────────────────┤
│  ChatArea.tsx                                                        │
│    │                                                                 │
│    ├─► SendPaymentLinkModal                                          │
│    │     └─► вызывает tbank-init-client                              │
│    │           + передаёт source_messenger_type: 'whatsapp'          │
│    │                                                                 │
│    └─► Фильтры сообщений по вкладкам                                 │
│          whatsappMessages = msg.messengerType === 'whatsapp'         │
│          └─► tbank_success должен иметь messenger_type: 'whatsapp'   │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Edge Functions                                  │
├──────────────────────────────────────────────────────────────────────┤
│  tbank-init-client                                                   │
│    └─► сохраняет source_messenger_type в online_payments             │
│                                                                      │
│  tbank-webhook                                                       │
│    └─► при CONFIRMED:                                                │
│        ├─► создаёт chat_message с messenger_type из online_payments  │
│        └─► отправляет сообщение клиенту через нужный мессенджер      │
└──────────────────────────────────────────────────────────────────────┘
```

### Шаг 1: Миграция базы данных

Добавить колонку `source_messenger_type` в таблицу `online_payments`:

```sql
ALTER TABLE online_payments 
ADD COLUMN IF NOT EXISTS source_messenger_type TEXT DEFAULT 'whatsapp';

COMMENT ON COLUMN online_payments.source_messenger_type 
IS 'Мессенджер, через который была отправлена ссылка на оплату (whatsapp/telegram/max)';
```

### Шаг 2: Обновить SendPaymentLinkModal

Передавать активный мессенджер в Edge Function:

**Файл**: `src/components/crm/SendPaymentLinkModal.tsx`

- Добавить prop `messengerType: 'whatsapp' | 'telegram' | 'max'`
- Передать его в запрос к `tbank-init-client`

### Шаг 3: Обновить ChatArea.tsx

При вызове SendPaymentLinkModal передавать текущую вкладку мессенджера:

**Файл**: `src/components/crm/ChatArea.tsx`

- Добавить prop `messengerType={activeMessengerTab}` к компоненту `SendPaymentLinkModal`

### Шаг 4: Обновить tbank-init-client Edge Function

Сохранять `source_messenger_type` в `online_payments`:

**Файл**: `supabase/functions/tbank-init-client/index.ts`

- Добавить `source_messenger_type` в тело запроса
- Сохранить в базу при создании записи `online_payments`

### Шаг 5: Обновить tbank-webhook Edge Function

При успешной оплате:
1. Создать сообщение с правильным `messenger_type` (из `source_messenger_type`)
2. Опционально: отправить реальное сообщение клиенту через мессенджер

**Файл**: `supabase/functions/tbank-webhook/index.ts`

```typescript
// Получаем source_messenger_type из online_payments
const messengerType = onlinePayment.source_messenger_type || 'whatsapp';

// Создаём сообщение с правильным messenger_type
await supabase.from('chat_messages').insert({
  client_id: onlinePayment.client_id,
  organization_id: onlinePayment.organization_id,
  message_text: `tbank_success ${amountRub}`,
  message_type: 'system',
  is_outgoing: false,
  is_read: false,
  messenger_type: messengerType,  // ← Теперь 'whatsapp' вместо 'system'
});
```

### Шаг 6 (опционально): Отправить реальное сообщение клиенту

Для полноценного уведомления клиенту можно вызвать соответствующий Edge Function для отправки сообщения:

```typescript
// Опционально: отправить сообщение клиенту через мессенджер
if (messengerType === 'whatsapp') {
  await supabase.functions.invoke('whatsapp-send', {
    body: {
      client_id: onlinePayment.client_id,
      message: `✅ Оплата на сумму ${amountRub.toLocaleString()}₽ прошла успешно! Спасибо!`
    }
  });
}
```

## Изменяемые файлы

| Файл | Изменение |
|------|-----------|
| `supabase/migrations/XXXX.sql` | Добавить колонку `source_messenger_type` |
| `src/components/crm/SendPaymentLinkModal.tsx` | Принять и передать `messengerType` |
| `src/components/crm/ChatArea.tsx` | Передать `activeMessengerTab` в модалку |
| `supabase/functions/tbank-init-client/index.ts` | Сохранить `source_messenger_type` |
| `supabase/functions/tbank-webhook/index.ts` | Использовать `source_messenger_type` вместо 'system' |

## Результат

1. Ссылка на оплату отправляется через WhatsApp → `source_messenger_type: 'whatsapp'` сохраняется
2. При успешной оплате создаётся сообщение с `messenger_type: 'whatsapp'`
3. Сообщение отображается в диалоге WhatsApp в реальном времени
4. Красивая карточка "Оплата на сумму X₽ прошла успешно!" появляется в чате
