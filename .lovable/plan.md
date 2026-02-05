
## Исправление: Добавить обработку event type `chat`

### Проблема
Входящие сообщения WPP Platform приходят с `type: "chat"`, но этот тип не обрабатывается в switch-case. Код попадает в `default` и выводит "Unhandled event type: chat".

### Решение

**Файл:** `supabase/functions/wpp-webhook/index.ts`

Добавить `case 'chat':` в switch-case для обработки входящих сообщений:

```text
Строки 194-204 (до):
      case 'message.incoming':
      case 'message':
      case 'message_in':
      case 'messages.upsert':
        // Incoming message...

Строки 194-205 (после):
      case 'message.incoming':
      case 'message':
      case 'message_in':
      case 'messages.upsert':
      case 'chat':                      // <-- ДОБАВИТЬ
        // Incoming message...
```

**Дополнительно:** Обновить версию на `v2.5.1` (строка 11).

### После деплоя
```bash
# 1. Скопировать функции
rsync -avz ./supabase/functions/ \
  automation@api.academyos.ru:/home/automation/supabase-project/volumes/functions/

# 2. Перезапустить
docker compose restart functions

# 3. Проверить версию и обработку
docker compose logs functions | grep wpp-webhook | tail -10
```

Ожидаемый результат в логах:
```
[wpp-webhook][v2.5.1] Event type: chat Account: 0000000000009
[wpp-webhook] handleIncomingMessage called with: { from: "+79852615056", ... }
[wpp-webhook] ✅ Message saved: <uuid> for client: <uuid>
```
