

# Диагностика: почему бот не отправляет сообщения

## Корневая проблема

Wappi Telegram API (`/tapi/sync/message/send`) использует поле `recipient`. Для **личного аккаунта** Wappi может отправлять по номеру телефона (потому что контакт есть в телефонной книге). Для **бота** — только по `chat_id` или `user_id`, потому что у бота нет телефонной книги.

**Цепочка отказа:**
1. Smart routing выбирает бота (через dead-link fallback)
2. `recipient` = номер телефона клиента (например `79161234567`)
3. Wappi API для бота возвращает ошибку (PEER_NOT_FOUND или IMPORT_FAILED)
4. Система переходит к fallback → alternative integrations → primary (личный аккаунт) → отправляет с него

## Что нужно сделать (2 изменения)

### 1. Edge Function `telegram-send/index.ts`: использовать `telegram_user_id` / `telegram_chat_id` при отправке через бота

Когда выбрана интеграция с типом "бот" (можно определить по `settings.botToken` или `settings.isBot`), вместо номера телефона нужно использовать `telegram_user_id` или `telegram_chat_id` как recipient.

Конкретно, в секции определения recipient (строки ~480-667), добавить проверку: если выбранная интеграция — бот, и recipient выглядит как телефон (`isLikelyPhoneNumber(recipient) === true`), попытаться найти `telegram_user_id` или `telegram_chat_id` клиента из:
- `client.telegram_user_id` (для client mode)
- `client.telegram_chat_id` (для client mode)
- `client_phone_numbers.telegram_user_id` (для phone records)
- `client_phone_numbers.telegram_chat_id` (для phone records)

Если ни один Telegram ID не найден — пропустить бота и сразу перейти к личному аккаунту (который может слать по телефону).

### 2. Добавить диагностику в логи

В функции `sendMessage` (строки 966-1022), при ошибке от Wappi, логировать:
- Какая интеграция была выбрана (ID, provider, isBot)
- Какой recipient использовался
- Полный ответ Wappi

Это позволит видеть в логах self-hosted сервера точную причину отказа.

## Техническая реализация

### Определение "бот vs личный аккаунт"

В настройках интеграции (`settings`) добавить проверку: если `settings.botToken` есть ИЛИ `settings.isBot === true`, это бот. У бота нет телефонной книги, поэтому отправка по номеру телефона невозможна.

Если такого поля нет в текущих настройках, можно определить по контексту: если при первой попытке Wappi вернул IMPORT_FAILED/PEER_NOT_FOUND для телефонного номера, а у клиента есть `telegram_user_id` — повторить с `telegram_user_id` как recipient через ту же интеграцию (не переключаясь на другую).

### Изменение порядка fallback

Текущий порядок fallback при ошибке:
```text
1. Основная попытка (recipient) -> FAIL
2. Phone fallback (тот же integration) -> FAIL 
3. Alternative integrations -> SUCCESS (но с primary!)
```

Новый порядок:
```text
1. Основная попытка (recipient) -> FAIL
2. Если recipient=phone И у клиента есть telegram_user_id:
   -> Повтор с telegram_user_id через ТУ ЖЕ интеграцию (бота) -> может SUCCESS
3. Phone fallback (тот же integration) -> FAIL (для бота)
4. Alternative integrations
```

### Файлы для изменения

- `supabase/functions/telegram-send/index.ts` — основная логика: после определения recipient, если интеграция — бот и recipient — телефон, подменить recipient на telegram_user_id/chat_id из БД
- Деплой на self-hosted

