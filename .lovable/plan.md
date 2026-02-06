

## Обновление WPP Delete и Edit на новое API

### Проблема

Функции `wpp-delete` и `wpp-edit` используют старое API WPP-Connect:
- `POST /api/${sessionName}/delete-message`
- `POST /api/${sessionName}/edit-message`

Нужно переключить на новое WPP Platform API:
- **Delete**: `DELETE /api/messages/{taskId}`
- **Edit**: `DELETE /api/messages/{oldTaskId}` → `POST /api/messages/text`

### Текущее состояние

`wpp-send` уже сохраняет `taskId` в поле `external_message_id` при отправке сообщений — это правильно и не требует изменений.

---

### Технический план

#### 1. Файл: `supabase/functions/_shared/wpp.ts`

Добавить два новых метода в `WppMsgClient`:

```typescript
/**
 * Delete message by taskId
 * DELETE /api/messages/{taskId}
 */
async deleteMessage(taskId: string): Promise<{ success: boolean; error?: string }> {
  const url = `${this.baseUrl}/api/messages/${encodeURIComponent(taskId)}`;
  
  try {
    await this._fetch(url, { method: 'DELETE' });
    return { success: true };
  } catch (error: any) {
    console.error(`[WppMsgClient] Delete message error:`, error);
    return { success: false, error: error.message };
  }
}
```

---

#### 2. Файл: `supabase/functions/wpp-delete/index.ts`

Полная переработка для использования нового API:

1. Импортировать `WppMsgClient` из `../_shared/wpp.ts`
2. Получить WPP интеграцию из `messenger_integrations` (как в wpp-send)
3. Вызвать `DELETE /api/messages/{taskId}` через `wpp.deleteMessage(taskId)`
4. Обновить запись в БД

**Ключевые изменения:**
- Вместо `WPP_HOST` + `WPP_SECRET` → использовать `wppApiKey` из интеграции
- Вместо `POST /delete-message` → `DELETE /api/messages/{taskId}`
- `taskId` берётся из `external_message_id` сообщения

---

#### 3. Файл: `supabase/functions/wpp-edit/index.ts`

Полная переработка для реализации DELETE + POST:

1. Импортировать `WppMsgClient` из `../_shared/wpp.ts`
2. Получить WPP интеграцию из `messenger_integrations`
3. Удалить старое сообщение: `DELETE /api/messages/{oldTaskId}`
4. Отправить новое: `POST /api/messages/text`
5. Обновить запись в БД с новым `taskId`

**Ключевые изменения:**
- Вместо `POST /edit-message` → `DELETE + POST`
- Сохранять новый `taskId` в `external_message_id`

---

### Диаграмма потока (Edit)

```text
┌─────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   wpp-edit      │────▶│ DELETE            │────▶│ Старое сообщение│
│   Edge Function │     │ /api/messages/123 │     │ удалено в WPP   │
└────────┬────────┘     └───────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   POST          │────▶│ WPP Platform      │────▶│ Новый taskId    │
│   /api/messages │     │ создаёт новое msg │     │ = 456           │
│   /text         │     └───────────────────┘     └─────────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│ UPDATE chat_messages                            │
│ SET message_text = 'новый текст',              │
│     external_message_id = '456'                 │
│ WHERE id = messageId                            │
└─────────────────────────────────────────────────┘
```

---

### Изменяемые файлы

| Файл | Изменения |
|------|-----------|
| `supabase/functions/_shared/wpp.ts` | Добавить метод `deleteMessage(taskId)` |
| `supabase/functions/wpp-delete/index.ts` | Переписать на новое API с WppMsgClient |
| `supabase/functions/wpp-edit/index.ts` | Переписать на DELETE + POST с WppMsgClient |

### Ожидаемый результат

- Удаление сообщений работает через `DELETE /api/messages/{taskId}`
- Редактирование работает через DELETE старого + POST нового
- Новый `taskId` сохраняется при редактировании для возможности повторного редактирования/удаления
- Используется единый `WppMsgClient` для всех операций

