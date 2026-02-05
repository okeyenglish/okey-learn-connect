

## План: Исправить wpp-send для сохранения сообщений в БД

### Диагноз проблемы
1. Фронтенд корректно определяет провайдер WPP и вызывает `wpp-send`
2. WPP Platform отвечает успешно (`taskId` возвращается)
3. **НО**: Сообщение не сохраняется в `chat_messages` на сервере
4. **Причина**: На сервере старая версия `wpp-send/index.ts` без кода сохранения в БД

### Решение

**Шаг 1**: Обновить файл на сервере

Выполнить на сервере:

```bash
cat > /home/automation/supabase-project/volumes/functions/wpp-send/index.ts << 'WPPEOF'
[содержимое актуального файла из Lovable]
WPPEOF
```

**Шаг 2**: Перезапустить функции

```bash
docker compose restart functions
```

**Шаг 3**: Проверить логи после отправки тестового сообщения

```bash
docker compose logs functions 2>&1 | grep "\[wpp-send\]" | tail -20
```

### Ключевые строки которые должны быть в wpp-send (200-225):

```typescript
// Save message to database
const messageStatus = wppResult.success ? 'sent' : 'failed'

const { data: savedMessage, error: saveError } = await supabase
  .from('chat_messages')
  .insert({
    client_id: clientId,
    organization_id: orgId,
    message_text: messageText,
    is_outgoing: true,
    message_type: 'manager',
    messenger_type: 'whatsapp',
    message_status: messageStatus,
    external_message_id: wppResult.taskId,
    is_read: true,
    file_url: fileUrl,
    file_name: fileName,
    file_type: fileUrl ? getFileTypeFromUrl(fileUrl) : null,
    sender_id: user.id,
  })
  .select()
  .single()

if (saveError) {
  console.error('Error saving message to database:', saveError)
}
```

### Ожидаемый результат

После обновления:
- Ответ от `wpp-send` будет содержать `savedMessageId`
- Сообщения будут появляться в чате сразу после отправки
- В логах будет видно `[wpp-send] Sending to: 7XXXXXXXXXX` и результат сохранения

