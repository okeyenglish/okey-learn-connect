

## План: Исправление обработки ошибок в max-webhook и whatsapp-webhook

### Проблема

Функции `max-webhook` и `whatsapp-webhook` возвращают HTTP 500 при получении некорректных данных, потому что не проверяют наличие обязательных полей перед их использованием.

Строка 40 в `max-webhook/index.ts`:
```typescript
const instanceId = String(instanceData.idInstance);  // CRASH если instanceData undefined
```

---

### Решение

Добавить валидацию входящих данных в начале обработки webhook.

#### Файл: `supabase/functions/max-webhook/index.ts`

**Изменение 1:** После строки 35 добавить проверку:

```typescript
// Validate required webhook fields
if (!instanceData?.idInstance) {
  console.log('[max-webhook] Invalid payload - missing instanceData.idInstance');
  return successResponse({ status: 'ignored', reason: 'invalid payload' });
}
```

#### Файл: `supabase/functions/whatsapp-webhook/index.ts`

Аналогичная проверка для GreenAPI WhatsApp webhook (если там такая же проблема).

---

### Техническая справка

| Что | Почему |
|-----|--------|
| Возвращаем 200 OK вместо 500 | Чтобы Green API не делал повторные попытки для невалидных запросов |
| Логируем причину | Для диагностики в логах |
| Проверка `instanceData?.idInstance` | Optional chaining защищает от undefined |

---

### Шаги реализации

1. Добавить валидацию в `max-webhook/index.ts` (строки 36-40)
2. Проверить и добавить аналогичную валидацию в `whatsapp-webhook/index.ts`
3. Задеплоить функции через GitHub Actions
4. Протестировать webhook с тестовым запросом

