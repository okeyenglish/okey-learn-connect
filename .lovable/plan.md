

## Системные сообщения с именем менеджера при действиях

### Что будет сделано

При нажатии кнопок "Не требует ответа" и "Оплата внесена" в диалог вставляется системное сообщение вида:

- **"Иван Петров отметил(а): ответ не требуется"**
- **"Иван Петров подтвердил(а) оплату"**

Окончание "(а)" используется, так как пол сотрудника неизвестен.

### Технические детали

**Файл: `src/components/crm/ChatArea.tsx`**

1. В `handleMarkAsNoResponseNeeded` -- после успешной пометки сообщений как прочитанных (перед toast), вставить системное сообщение:

```typescript
await supabase.from('chat_messages').insert(buildMessageRecord({
  client_id: clientId,
  content: `${managerName} отметил(а): ответ не требуется`,
  message_type: 'system',
  messenger: activeMessengerTab,
  direction: 'outgoing',
  is_read: true,
  status: 'sent',
  organization_id: organizationId,
  metadata: { system_type: 'no_response_needed' }
}));
```

2. В `handlePaymentProcessed` -- после сброса `has_pending_payment`, вставить системное сообщение:

```typescript
await supabase.from('chat_messages').insert(buildMessageRecord({
  client_id: clientId,
  content: `${managerName} подтвердил(а) оплату`,
  message_type: 'system',
  messenger: activeMessengerTab,
  direction: 'outgoing',
  is_read: true,
  status: 'sent',
  organization_id: organizationId,
  metadata: { system_type: 'payment_confirmed' }
}));
```

Нужно получить `organizationId` -- проверим, есть ли он уже в компоненте, или возьмем из `authProfile`.

**Файл: `src/components/crm/ChatMessage.tsx`**

3. Добавить паттерны `отметил(а): ответ не требуется` и `подтвердил(а) оплату` в массив `systemPatterns` (строка ~176), чтобы они рендерились как компактные системные сообщения по центру.

**Файл: `src/components/crm/SalebotCallbackMessage.tsx`**

4. Добавить в `CALLBACK_CONFIG` два новых типа для корректного рендеринга если сообщение попадёт через callback-путь:

```typescript
no_response_needed: { label: 'Ответ не требуется', icon: CheckCheck, color: 'text-green-600' },
payment_confirmed: { label: 'Оплата подтверждена', icon: Banknote, color: 'text-emerald-600' },
```

### Результат

- Менеджеры видят в истории диалога кто и когда нажал кнопку
- Используется "(а)" для гендерно-нейтральной формы
- Сообщения сохраняются в БД и видны всем сотрудникам
- Рендерятся как компактные системные уведомления по центру чата
