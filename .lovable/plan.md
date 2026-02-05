

## Исправление дублирующихся объявлений в Edge Functions

### Проблема
На self-hosted сервере Edge Functions не загружаются из-за синтаксических ошибок:
- `Identifier 'maxUserId' has already been declared` в max-webhook
- `Identifier 'normalizePhone' has already been declared` в whatsapp-webhook

### Причина
Дублирующиеся объявления переменных/функций в одном файле.

---

### Исправление 1: max-webhook/index.ts

**Строка 227** - удалить повторное объявление `const maxUserId`:

```typescript
// БЫЛО (строка 227):
const maxUserId = extractPhoneFromChatId(chatId);

// СТАНЕТ:
const maxUserIdForSync = extractPhoneFromChatId(chatId);
```

И обновить вызов ниже:
```typescript
await syncTeacherFromClient(supabase, client.id, {
  phone: senderPhoneNumber ? String(senderPhoneNumber) : null,
  maxUserId: maxUserIdForSync,  // <- использовать новое имя
  maxChatId: chatId
});
```

---

### Исправление 2: whatsapp-webhook/index.ts

Объединить две функции `normalizePhone` в одну (строки 637-640 и 1159-1164):

**Оставить одну функцию** в начале файла (после импортов):
```typescript
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  // Normalize 8XXXXXXXXXX to 7XXXXXXXXXX for Russian numbers
  if (cleaned.length === 11 && cleaned.startsWith('8')) {
    cleaned = '7' + cleaned.slice(1);
  }
  return cleaned;
}
```

**Удалить вторую функцию** на строках 1159-1171.

---

### Порядок выполнения

1. Исправить max-webhook/index.ts (переименовать переменную)
2. Исправить whatsapp-webhook/index.ts (удалить дубликат функции)
3. Развернуть на self-hosted сервер
4. Перезапустить Edge Functions контейнер
5. Протестировать подключение WhatsApp

---

### Техническая заметка

После применения изменений выполнить на сервере:
```bash
cd /home/automation/supabase-project
docker compose restart functions
docker logs supabase-edge-functions 2>&1 | grep -i "error" | tail -20
```

