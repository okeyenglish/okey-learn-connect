

## Исправление: WPP удаление и редактирование сообщений - "Client not found"

### Проблема

При попытке удалить или отредактировать сообщение через WPP появляется ошибка "Client not found".

### Анализ

Обе функции (`wpp-delete` и `wpp-edit`) делают следующее:

1. Получают `clientId` из тела запроса
2. Запрашивают данные сообщения: `select('external_message_id, client_id, organization_id')`
3. **Проблема**: Затем ищут клиента по **переданному** `clientId`, а не по `messageData.client_id`

```typescript
// Уже есть client_id из сообщения
const { data: messageData } = await supabase
  .from('chat_messages')
  .select('external_message_id, client_id, organization_id') // <-- client_id здесь
  .eq('id', messageId)
  .single();

// Но используется переданный clientId
const { data: clientData } = await supabase
  .from('clients')
  .select('phone')
  .eq('id', clientId)  // <-- Потенциальное несоответствие
  .single();
```

**Причина ошибки**: Переданный `clientId` может не совпадать с `client_id` из записи сообщения, или клиент может быть soft-deleted (is_active = false) на self-hosted инстансе.

### Решение

Использовать `messageData.client_id` вместо переданного `clientId` для запроса клиента. Это гарантирует:
- Согласованность данных
- Клиент точно существует (сообщение ссылается на него)
- Нет зависимости от корректности переданного параметра

---

### Технический план

#### 1. Файл: `supabase/functions/wpp-delete/index.ts`

**Изменения (строка 59-63)**:

До:
```typescript
const { data: clientData, error: clientError } = await supabase
  .from('clients')
  .select('phone')
  .eq('id', clientId)
  .single();
```

После:
```typescript
// Use client_id from message record for consistency
const { data: clientData, error: clientError } = await supabase
  .from('clients')
  .select('phone')
  .eq('id', messageData.client_id)
  .single();
```

---

#### 2. Файл: `supabase/functions/wpp-edit/index.ts`

**Изменения (строка 59-64)**:

До:
```typescript
const { data: clientData, error: clientError } = await supabase
  .from('clients')
  .select('phone')
  .eq('id', clientId)
  .single();
```

После:
```typescript
// Use client_id from message record for consistency
const { data: clientData, error: clientError } = await supabase
  .from('clients')
  .select('phone')
  .eq('id', messageData.client_id)
  .single();
```

---

### Изменяемые файлы

| Файл | Изменения |
|------|-----------|
| `supabase/functions/wpp-delete/index.ts` | Использовать `messageData.client_id` вместо `clientId` |
| `supabase/functions/wpp-edit/index.ts` | Использовать `messageData.client_id` вместо `clientId` |

### Ожидаемый результат

- Удаление сообщений через WPP работает корректно
- Редактирование сообщений через WPP работает корректно
- Нет зависимости от корректности переданного `clientId` параметра
- Совместимость с self-hosted схемой

