

## План: Исправление нормализации телефонов для WPP

### Проблема

Номер `9852615056` отправляется в WhatsApp без кода страны `+7`. WhatsApp интерпретирует первые цифры `98` как код Ирана, и сообщение уходит на неправильный номер.

**Было:** `9852615056` → WhatsApp видит как `+98 52 6150 56` (Иран)
**Должно быть:** `79852615056` → WhatsApp видит как `+7 985 261-50-56` (Россия)

### Решение

Добавить функцию нормализации телефона в Edge Function `wpp-send/index.ts`, аналогичную существующей `normalizePhone` из `src/utils/phoneNormalization.ts`.

### Изменения

#### 1. `supabase/functions/wpp-send/index.ts`

**Добавить функцию нормализации (в конец файла):**

```typescript
/**
 * Нормализует телефон для WhatsApp API
 * - 9852615056 → 79852615056
 * - 89852615056 → 79852615056
 * - 79852615056 → 79852615056
 */
function normalizePhoneForWpp(phone: string): string {
  // Убираем все кроме цифр
  let cleaned = phone.replace(/\D/g, '')
  
  // Если 11 цифр и начинается с 8 (российский формат) → заменяем на 7
  if (cleaned.length === 11 && cleaned.startsWith('8')) {
    cleaned = '7' + cleaned.substring(1)
  }
  
  // Если 10 цифр и начинается с 9 → добавляем 7 (российский мобильный)
  if (cleaned.length === 10 && cleaned.startsWith('9')) {
    cleaned = '7' + cleaned
  }
  
  return cleaned
}
```

**Изменить строки 170-172:**

```typescript
// До:
const cleanPhone = phone.replace(/[^\d]/g, '')
const to = cleanPhone

// После:
const to = normalizePhoneForWpp(phone)
```

#### 2. Аналогичное исправление в `supabase/functions/max-send/index.ts`

Проверить и при необходимости добавить нормализацию при формировании `chatId`:

```typescript
// Текущий код (строка ~136):
const cleanPhone = phoneRecord.phone.replace(/[^\d]/g, '')
chatId = `${cleanPhone}@c.us`

// Должно быть:
const cleanPhone = normalizePhoneForMax(phoneRecord.phone)
chatId = `${cleanPhone}@c.us`
```

### Логика нормализации

| Входной номер | После нормализации | Результат |
|---------------|-------------------|-----------|
| 9852615056 | 79852615056 | Россия (+7) |
| 89852615056 | 79852615056 | Россия (+7) |
| +7 985 261-50-56 | 79852615056 | Россия (+7) |
| 79852615056 | 79852615056 | Россия (+7) |
| 380501234567 | 380501234567 | Украина (без изменений) |

### После исправления

1. Задеплоить edge functions на сервер: `docker compose up -d --build`
2. Протестировать отправку сообщения на российский номер
3. Проверить логи: `docker compose logs functions 2>&1 | grep "\[wpp-send\]" | tail -10`

