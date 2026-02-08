
## Цель
Вернуть возможность отправки сообщений в Telegram через Wappi по номеру телефона (как fallback), и исправить ошибку сборки PWA.

---

## Что было сделано неправильно

В предыдущем изменении я ошибочно **убрал fallback на телефон** при отправке в `telegram-send`, предположив, что Wappi не поддерживает отправку по номеру. 

Но документация Wappi явно указывает:
> **recipient**: Получатель — айди, username, **телефон (если открыт)**

Пример: `"recipient": "79202223344"`

То есть Wappi **поддерживает** три формата `recipient`:
- `60227586` — Telegram user/chat ID
- `minayq` — username (без @)
- `79202223344` — телефон (если пользователь разрешил поиск по номеру)

---

## План исправления

### 1. Исправить `telegram-send` — вернуть fallback на телефон

**Файл:** `supabase/functions/telegram-send/index.ts`

Текущая логика:
- Ищем `telegram_chat_id` или `telegram_user_id`
- Если нет — возвращаем ошибку "У клиента нет Telegram"

Нужно:
- Ищем `telegram_chat_id` или `telegram_user_id`
- **Если нет — используем номер телефона** (очищенный от `+` и пробелов)
- Только если и телефона нет — возвращаем ошибку

Приоритет recipient:
1. `telegram_chat_id` (самый надёжный — уже был контакт)
2. `telegram_user_id` 
3. Телефон из `client_phone_numbers` (primary) или `clients.phone`

### 2. Исправить сборку PWA

**Файл:** `src/sw.ts`

Судя по ошибке сборки, `vite-plugin-pwa` всё ещё не находит injection point. Нужно убедиться, что строка `self.__WB_MANIFEST` присутствует буквально.

---

## Изменения в коде

### telegram-send/index.ts

```typescript
// Логика определения recipient с fallback на телефон

let recipient: string | null = null;

// 1. Try phoneId if specified
if (phoneId) {
  const { data: phoneRecord } = await supabase
    .from('client_phone_numbers')
    .select('telegram_chat_id, telegram_user_id, phone_number')
    .eq('id', phoneId)
    .eq('client_id', clientId)
    .single();

  if (phoneRecord) {
    recipient = phoneRecord.telegram_chat_id 
      || phoneRecord.telegram_user_id?.toString() 
      || normalizePhone(phoneRecord.phone_number);  // <-- fallback
  }
}

// 2. Try primary phone
if (!recipient) {
  const { data: primaryPhone } = await supabase
    .from('client_phone_numbers')
    .select('telegram_chat_id, telegram_user_id, phone_number')
    .eq('client_id', clientId)
    .eq('is_primary', true)
    .maybeSingle();

  if (primaryPhone) {
    recipient = primaryPhone.telegram_chat_id 
      || primaryPhone.telegram_user_id?.toString() 
      || normalizePhone(primaryPhone.phone_number);  // <-- fallback
  }
}

// 3. Fallback to client's telegram fields or phone
if (!recipient) {
  recipient = client.telegram_chat_id 
    || client.telegram_user_id?.toString() 
    || normalizePhone(client.phone);  // <-- fallback
}

// Helper function
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  // Remove + and non-digit characters, Wappi expects digits only
  return phone.replace(/\D/g, '') || null;
}
```

### src/sw.ts

Убедиться, что injection point корректен — должна быть точная строка `self.__WB_MANIFEST`.

---

## Ожидаемый результат

1. **Отправка сообщений в Telegram работает**, даже если клиент ещё не писал (нет `telegram_chat_id`) — используется телефон
2. **Сборка проходит** без ошибок PWA
3. Если у получателя закрыт поиск по номеру — Wappi вернёт ошибку, но это уже ограничение на стороне Telegram, а не нашего кода

---

## Какие файлы будут изменены

- `supabase/functions/telegram-send/index.ts` — вернуть fallback на телефон
- `src/sw.ts` — fix injection point для сборки

---

## Риски

- Если у получателя закрыта настройка "Кто может найти меня по номеру", Wappi вернёт ошибку `recipient not found`
- Это ожидаемое поведение — пользователю покажется понятная ошибка
