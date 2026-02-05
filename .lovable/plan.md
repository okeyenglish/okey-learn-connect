

## План: Добавить нормализацию российских телефонов в whatsapp-send

### Проблема
При отправке WhatsApp сообщений через Green API номер `9852615056` отправляется как `9852615056@c.us` вместо `79852615056@c.us`, что приводит к ошибке доставки.

### Решение
Добавить функцию `normalizePhoneForWhatsApp` в edge function `whatsapp-send/index.ts` (аналогично тому, что уже сделано в `wpp-send` и `max-send`).

### Изменения в файле

**Файл:** `supabase/functions/whatsapp-send/index.ts`

1. **Добавить функцию нормализации в конец файла:**
```typescript
function normalizePhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  // 89852615056 -> 79852615056
  if (cleaned.length === 11 && cleaned.startsWith('8')) {
    cleaned = '7' + cleaned.substring(1);
  }
  
  // 9852615056 -> 79852615056
  if (cleaned.length === 10 && cleaned.startsWith('9')) {
    cleaned = '7' + cleaned;
  }
  
  return cleaned;
}
```

2. **Заменить 3 места где формируется chatId:**

- **Строка 172:** `const cleanPhone = normalizePhoneForWhatsApp(phoneRecord.phone);`
- **Строка 191:** `const cleanPhone = normalizePhoneForWhatsApp(primaryPhone.phone);`
- **Строка 237:** `const cleanPhone = normalizePhoneForWhatsApp(phone);`

3. **Добавить логирование для отладки (строка ~238):**
```typescript
console.log('[whatsapp-send] Normalized phone:', cleanPhone, '(original:', phone, ')');
```

### Команда для сервера

После того как я внесу изменения в код Lovable, нужно будет:
1. Скопировать обновлённый файл на сервер
2. Перезапустить контейнер functions

### Результат
Номера `9852615056`, `89852615056`, `+7 985 261-50-56` будут корректно преобразовываться в `79852615056@c.us` перед отправкой в Green API.

