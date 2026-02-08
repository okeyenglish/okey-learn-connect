
## Исправление нормализации телефона в telegram-send

### Проблема

Функция `normalizePhone` в `telegram-send` **не добавляет код страны "7"** для российских номеров:

```typescript
// ТЕКУЩИЙ КОД (неправильный):
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;  // ❌ 9161234567 → 9161234567
}
```

В базе данных номера часто хранятся **без кода страны**:
- `9161234567` (10 цифр, начинается с 9)
- `89161234567` (11 цифр, начинается с 8)

Wappi API ожидает формат с кодом страны: `79202223344`

### Решение

Заменить `normalizePhone` на `normalizePhoneForWpp` по аналогии с `wpp-send`:

```typescript
// ИСПРАВЛЕННЫЙ КОД:
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  let digits = phone.replace(/\D/g, '');
  
  // Если 11 цифр и начинается с 8 (российский формат) → заменяем на 7
  if (digits.length === 11 && digits.startsWith('8')) {
    digits = '7' + digits.substring(1);
  }
  
  // Если 10 цифр и начинается с 9 → добавляем 7 (российский мобильный)
  if (digits.length === 10 && digits.startsWith('9')) {
    digits = '7' + digits;
  }
  
  return digits.length >= 10 ? digits : null;
}
```

### Результат трансформаций

| Исходный номер | Было | Станет |
|---------------|------|--------|
| `9161234567` | `9161234567` ❌ | `79161234567` ✓ |
| `89161234567` | `89161234567` ❌ | `79161234567` ✓ |
| `79161234567` | `79161234567` ✓ | `79161234567` ✓ |
| `+7 916 123-45-67` | `79161234567` ✓ | `79161234567` ✓ |

---

## Технические изменения

### Файл: `supabase/functions/telegram-send/index.ts`

**Строки 151-158** — заменить функцию `normalizePhone`:

```typescript
// Helper function to normalize phone for Wappi (digits only, with Russian +7 prefix)
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // Если 11 цифр и начинается с 8 (российский формат) → заменяем на 7
  if (digits.length === 11 && digits.startsWith('8')) {
    digits = '7' + digits.substring(1);
  }
  
  // Если 10 цифр и начинается с 9 → добавляем 7 (российский мобильный)
  if (digits.length === 10 && digits.startsWith('9')) {
    digits = '7' + digits;
  }
  
  // Return null if too short after normalization
  return digits.length >= 10 ? digits : null;
}
```

---

## После применения

1. **Деплой функции** — автоматический на Lovable Cloud
2. **Self-hosted обновление**:
   ```bash
   # Скопировать обновлённую функцию
   cp -r telegram-send /volumes/functions/
   docker compose restart functions
   ```
3. **Тестирование**: отправить сообщение клиенту с номером `9161234567` → должен преобразоваться в `79161234567`
