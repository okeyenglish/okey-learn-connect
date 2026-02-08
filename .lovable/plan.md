
## Диагностика и исправление проблем Telegram Wappi

### Понимание проблемы

На основе ответов пользователя и анализа кода:

**Webhook (входящие сообщения)**:
- HTTP 405 на GET — это нормально, webhook ожидает POST
- Wappi показывает "peer not found" в логах — это означает проблему на стороне Wappi/Telegram, а не webhook

**Отправка сообщений**:
- Ошибка "peer not found" означает, что Telegram API не может найти получателя
- Код использует fallback на телефон, но это НЕ РАБОТАЕТ для большинства случаев

### Почему "peer not found"?

Telegram User API (который использует Wappi) может отправить сообщение только если:
1. Есть **telegram_chat_id** (из предыдущего диалога)
2. Есть **username** пользователя (например, `minayq`)
3. Номер телефона добавлен **в контакты** Telegram-аккаунта, привязанного к Wappi

Отправка просто по номеру телефона **не поддерживается** Telegram User API, если:
- Номер не в ваших контактах
- У получателя скрыт номер в настройках приватности
- Нет истории переписки

### План исправлений

**1. Улучшить логирование для диагностики**

В `telegram-send` добавить детальные логи, чтобы видеть какой именно recipient используется и почему Wappi возвращает ошибку.

**2. Добавить поддержку username**

Wappi поддерживает отправку по username (например, `minayq`). Нужно:
- Добавить колонку `telegram_username` в clients/client_phone_numbers (если нет)
- Использовать username как приоритетный fallback перед телефоном

**3. Улучшить обработку ошибки "peer not found"**

Вернуть понятное сообщение пользователю CRM о том, почему не удалось отправить:
- "Клиент не найден в Telegram. Попросите его написать вам первым."

**4. Webhook: добавить поддержку wh_type "outgoing_message_api"**

Согласно документации Wappi, есть отдельный тип `outgoing_message_api` для сообщений, отправленных через API. Текущий код не обрабатывает его.

---

## Технические изменения

### Файл: `supabase/functions/telegram-send/index.ts`

**Изменения в логике определения recipient (строки 160-215)**:

```text
1. Добавить приоритет username перед телефоном:
   - telegram_chat_id (самый надёжный)
   - telegram_user_id
   - telegram_username (если есть)
   - normalizePhone (последний fallback)

2. Добавить детальное логирование:
   - Логировать какие поля есть у клиента
   - Логировать финальный recipient
   - Логировать полный ответ от Wappi

3. Улучшить обработку ошибки "peer not found":
   - Распознавать эту ошибку
   - Возвращать понятное сообщение
```

### Файл: `supabase/functions/telegram-webhook/index.ts`

**Добавить обработку `outgoing_message_api` (строки 141-158)**:

Согласно документации Wappi, помимо `outgoing_message` и `outgoing_message_phone` есть `outgoing_message_api` для сообщений, отправленных через API. Нужно добавить его в switch-case.

### Файл: `supabase/functions/_shared/types.ts`

**Обновить интерфейс TelegramWappiMessage (строки 1050-1076)**:

Добавить недостающие поля из документации Wappi:
- `status?: string` — для delivery_status
- `stanza_id?: string` — ID сообщения для обновления статуса
- `chat_type?: string` — тип чата (user, group, channel)
- `task_id?: string` — ID задачи для API-сообщений

---

## Рекомендации для пользователя

После применения изменений:

1. **Для новых клиентов**: Клиент должен **написать первым** в Telegram — только тогда появится `telegram_chat_id`

2. **Для существующих клиентов без chat_id**: 
   - Если есть username — можно отправить
   - Если только телефон — скорее всего не сработает (ограничение Telegram)

3. **Self-hosted обновление**: После деплоя скопировать функции:
```bash
cp -r telegram-send telegram-webhook _shared /volumes/functions/
docker compose restart functions
```

---

## Проверка после изменений

1. Открыть логи edge functions на self-hosted:
```bash
docker compose logs -f functions | grep telegram
```

2. Попробовать отправить сообщение клиенту, у которого есть `telegram_chat_id`

3. Попробовать отправить клиенту без `telegram_chat_id` — убедиться что ошибка понятная

4. Попросить клиента написать в Telegram — проверить что webhook сохраняет `telegram_chat_id`

