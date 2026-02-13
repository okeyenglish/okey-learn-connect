

# Исправление: сохранять telegram_user_id из вебхука и использовать при отправке

## Суть проблемы

1. Вебхук получает `message.from` = Telegram User ID клиента (например `1073928961`)
2. Вебхук сохраняет `telegram_chat_id` в клиента, но **НЕ сохраняет `telegram_user_id`**
3. При отправке `telegram-send` ищет `telegram_user_id` у клиента — поле пустое
4. Результат: отправляет по телефону, бот не может, fallback на личный аккаунт

## Решение (2 файла)

### 1. `telegram-webhook/index.ts` — сохранять telegram_user_id в клиента

Строка 580-586: при обновлении клиента после входящего сообщения, добавить `telegram_user_id`:

```
Было:
  .update({ last_message_at, telegram_chat_id: chatId })

Станет:
  .update({ last_message_at, telegram_chat_id: chatId, telegram_user_id: String(telegramUserId) })
```

Это гарантирует, что после первого сообщения от клиента через Telegram, его `telegram_user_id` будет сохранён.

### 2. `telegram-send/index.ts` — убрать зависимость от `isBot`, всегда предпочитать ID

Строки 683-758: убрать проверку `isBot` (которая всегда `false`). Вместо этого, если recipient — телефон и у клиента есть `telegram_user_id` или `telegram_chat_id`, всегда подменять recipient на ID. Это работает корректно для обоих типов интеграций:

- **Бот**: обязан использовать ID (телефон не работает) — проблема решена
- **Личный аккаунт**: может отправлять и по ID, и по телефону — ID тоже работает

```
Было:
  const isBot = !!(settings?.botToken || settings?.isBot);  // всегда false
  if (isBot && isLikelyPhoneNumber(recipient)) { ... }

Станет:
  // Всегда предпочитать telegram ID вместо телефона
  if (isLikelyPhoneNumber(recipient)) {
    // Поиск telegram_user_id/chat_id из client и client_phone_numbers
    // Если найден — подменить recipient
  }
```

Переменную `botSkipSend` тоже убрать — если ID не найден, отправляем по телефону (для личного аккаунта сработает, для бота упадёт и сработает fallback на другую интеграцию).

### Результат

После первого входящего сообщения от клиента через Telegram:
1. Вебхук сохраняет `telegram_user_id` в `clients`
2. При ответе `telegram-send` видит ID и использует его
3. И бот, и личный аккаунт успешно отправляют по ID

### Файлы для изменения

- `supabase/functions/telegram-webhook/index.ts` — добавить сохранение `telegram_user_id`
- `supabase/functions/telegram-send/index.ts` — убрать `isBot` проверку, всегда предпочитать ID

