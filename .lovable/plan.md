
## План: Исправление удаления и реакций WPP

### Проблема

API WPP платформы ожидает `waMessageId` (реальный ID сообщения WhatsApp), но для исходящих сообщений мы сохраняем `taskId` (внутренний ID платформы).

**Формат API реакций:**
```json
{
  "to": "+79852615056",
  "waMessageId": "ABCD1234...",
  "emoji": "🔥"
}
```

### Необходимые изменения

#### 1. Обновить `handleMessageStatus` в webhook для сохранения `waMessageId`

Когда WPP присылает статус "sent" или "delivered", обновить `external_message_id` реальным `waMessageId`:

```typescript
async function handleMessageStatus(data: any) {
  const { id, status, taskId, waMessageId } = data;
  
  if (taskId && waMessageId) {
    // Обновляем external_message_id с taskId на реальный waMessageId
    await supabase
      .from('chat_messages')
      .update({ 
        message_status: status,
        external_message_id: waMessageId,
      })
      .eq('external_message_id', taskId);
  }
}
```

#### 2. Исправить формат запроса в `WppMsgClient.reactToMessage`

**Файл:** `supabase/functions/_shared/wpp.ts`

```typescript
async reactToMessage(
  waMessageId: string, 
  emoji: string,
  to: string  // Добавить параметр to (номер телефона)
): Promise<{ success: boolean; error?: string }> {
  const url = `${this.baseUrl}/api/messages/react`;
  
  try {
    const result = await this._fetch(url, {
      method: 'POST',
      body: JSON.stringify({ 
        to,           // Номер телефона получателя
        waMessageId,  // Реальный ID сообщения WhatsApp
        emoji,
      }),
    });
    return { success: result.status !== 'error', error: result.message };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

#### 3. Обновить `wpp-react` edge function

**Файл:** `supabase/functions/wpp-react/index.ts`

Получать номер телефона из клиента/учителя и передавать в API:

```typescript
// Получить номер телефона
let phoneNumber: string | null = null;
if (messageData.client_id) {
  const { data: client } = await supabase
    .from('clients')
    .select('phone')
    .eq('id', messageData.client_id)
    .single();
  phoneNumber = client?.phone;
} else if (messageData.teacher_id) {
  const { data: teacher } = await supabase
    .from('teachers')
    .select('phone')
    .eq('id', messageData.teacher_id)
    .single();
  phoneNumber = teacher?.phone;
}

if (!phoneNumber) {
  return errorResponse('Phone number not found for message recipient', 400);
}

// Нормализовать номер
const to = normalizePhoneForWpp(phoneNumber);

// Отправить реакцию
const reactResult = await wpp.reactToMessage(taskId, emoji, to);
```

#### 4. Уточнить формат удаления

Проверить документацию WPP API:
- Если удаление использует `waMessageId`, аналогично обновить `wpp-delete`
- Если принимает `taskId` - оставить как есть

### Что нужно от владельца WPP API

1. **Формат удаления**: `DELETE /api/messages/{waMessageId}` или `DELETE /api/messages/{taskId}`?
2. **Webhook статуса**: Присылает ли webhook `waMessageId` при доставке сообщения?

### Временное решение

Пока нет обновления `waMessageId` через webhook:
- Реакции и удаление будут работать только для **входящих** сообщений
- Для исходящих покажем сообщение "Недоступно для исходящих сообщений"

### Последовательность задач

| # | Задача | Файлы |
|---|--------|-------|
| 1 | Исправить формат `reactToMessage` | `_shared/wpp.ts` |
| 2 | Обновить `wpp-react` с получением телефона | `wpp-react/index.ts` |
| 3 | Добавить обработку `waMessageId` в webhook | `wpp-webhook/index.ts` |
| 4 | Уточнить и исправить формат удаления | `wpp-delete/index.ts`, `_shared/wpp.ts` |
