
## ✅ WPP API: Исправлено удаление и реакции

### Архитектура ID (подтверждено)

| Операция | API | ID |
|----------|-----|-----|
| **Удаление** | `DELETE /api/messages/:taskId` | taskId |
| **Реакция** | `POST /api/messages/react` | waMessageId + to |

### Хранение ID в БД

- `external_message_id` = **taskId** (для удаления исходящих)
- `metadata.waMessageId` = **waMessageId** (для реакций на исходящие)
- Для входящих: `external_message_id` = waMessageId (исходно)

### Изменённые файлы

1. **`_shared/wpp.ts`**
   - Удалён `deleteMessageByWaId()` (был неправильный)
   - `deleteMessage(taskId)` - остаётся для удаления

2. **`wpp-webhook/index.ts`**
   - `handleMessageStatus`: сохраняет `waMessageId` в **metadata**, не перезаписывает `external_message_id`

3. **`wpp-delete/index.ts`**
   - Использует `deleteMessage(taskId)` где `taskId = external_message_id`

4. **`wpp-react/index.ts`**
   - Берёт `waMessageId` из `metadata.waMessageId` (исходящие) или `external_message_id` (входящие)

### Self-hosted

```bash
# Скопировать файлы:
# - supabase/functions/_shared/wpp.ts
# - supabase/functions/wpp-webhook/index.ts  
# - supabase/functions/wpp-delete/index.ts
# - supabase/functions/wpp-react/index.ts

docker compose restart functions
```
