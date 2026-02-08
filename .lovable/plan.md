
# Исправление: Совместимость tbank-webhook с self-hosted схемой

## Проблема

Вебхук T-Bank отработал успешно (запись в `webhook_logs` и `online_payments` обновилась), но сообщение в чат **не создалось** из-за ошибки:

```
ERROR: 42703: column "content" does not exist
```

Self-hosted схема `chat_messages` отличается от Cloud:
- Использует `message_text` вместо `content`
- Использует `is_outgoing` вместо `direction`
- Использует `messenger_type` вместо `messenger`
- Нет колонки `status`

## Решение

### Изменение в `supabase/functions/tbank-webhook/index.ts`

Заменить несовместимые колонки на self-hosted совместимые:

**Было (строки 138-146):**
```typescript
const { error: chatError } = await supabase.from('chat_messages').insert({
  client_id: onlinePayment.client_id,
  organization_id: onlinePayment.organization_id,
  content: `tbank_success ${amountRub}`,           // ❌ не существует
  message_type: 'system',
  direction: 'incoming',                           // ❌ не существует
  messenger: 'system',                             // ❌ неправильное имя
  status: 'delivered',                             // ❌ не существует
});
```

**Станет:**
```typescript
const { error: chatError } = await supabase.from('chat_messages').insert({
  client_id: onlinePayment.client_id,
  organization_id: onlinePayment.organization_id,
  message_text: `tbank_success ${amountRub}`,      // ✅ правильная колонка
  message_type: 'system',
  is_outgoing: false,                              // ✅ заменяет direction: 'incoming'
  is_read: false,                                  // ✅ стандартное поле
  messenger_type: 'system',                        // ✅ правильное имя колонки
});
```

## Результат после исправления

1. При успешной оплате через T-Bank в чат клиента создаётся сообщение `tbank_success СУММА`
2. Сообщение отображается в CRM как "Успешная оплата на X₽" (уже поддерживается в `SalebotCallbackMessage`)
3. Клиент "поднимается" в списке диалогов

## Тестирование

После деплоя повторить тестовый платёж через T-Bank и проверить:
```sql
SELECT id, client_id, message_text, message_type, created_at 
FROM chat_messages 
WHERE message_text LIKE 'tbank_success%' 
ORDER BY created_at DESC LIMIT 5;
```
