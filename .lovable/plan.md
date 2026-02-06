
## План: Исправление удаления и реакций WPP

### ✅ Статус: ВЫПОЛНЕНО

### Реализованные изменения

#### 1. ✅ `WppMsgClient.reactToMessage` - обновлён формат запроса

**Файл:** `supabase/functions/_shared/wpp.ts`

```typescript
async reactToMessage(waMessageId: string, emoji: string, to: string)
// POST /api/messages/react { to, waMessageId, emoji }
```

#### 2. ✅ `WppMsgClient.deleteMessageByWaId` - новый метод удаления

```typescript
async deleteMessageByWaId(waMessageId: string, to: string)
// DELETE /api/messages/{waMessageId}?to={phoneNumber}
```

#### 3. ✅ `wpp-react` edge function - получение телефона

**Файл:** `supabase/functions/wpp-react/index.ts`

- Получает телефон из `clients` или `teachers` по `client_id`/`teacher_id`
- Нормализует номер для WPP API (`+7XXXXXXXXXX`)
- Отправляет реакцию с правильным форматом: `{ to, waMessageId, emoji }`

#### 4. ✅ `wpp-delete` edge function - удаление с телефоном

**Файл:** `supabase/functions/wpp-delete/index.ts`

- Получает телефон аналогично `wpp-react`
- Использует новый метод `deleteMessageByWaId(waMessageId, to)`
- Graceful handling если сообщение не найдено на WPP

#### 5. ✅ `wpp-webhook` - сохранение waMessageId из статуса

**Файл:** `supabase/functions/wpp-webhook/index.ts`

```typescript
async function handleMessageStatus(data: any) {
  const { id, status, taskId, waMessageId } = data;
  
  // Если получили waMessageId - обновляем external_message_id
  if (taskId && waMessageId) {
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

### Деплой на self-hosted

Для применения изменений на `api.academyos.ru`:

```bash
# Скопировать файлы
cp supabase/functions/_shared/wpp.ts /home/automation/supabase-project/volumes/functions/_shared/
cp supabase/functions/wpp-react/index.ts /home/automation/supabase-project/volumes/functions/wpp-react/
cp supabase/functions/wpp-delete/index.ts /home/automation/supabase-project/volumes/functions/wpp-delete/
cp supabase/functions/wpp-webhook/index.ts /home/automation/supabase-project/volumes/functions/wpp-webhook/

# Перезапустить функции
docker compose restart functions
```

### Важное примечание

**Реакции и удаление для исходящих сообщений** будут работать только после того, как webhook получит `waMessageId` в событии статуса (`message.status`). 

Если ваш WPP API не присылает `waMessageId` в webhook статуса - реакции/удаление будут работать только для **входящих** сообщений (у которых `waMessageId` сохраняется сразу).
