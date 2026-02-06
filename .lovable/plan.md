
## План: Исправление обработки медиа в wpp-webhook

### Проблема

WPP платформа отправляет входящие медиа-сообщения в формате:
```json
{
  "text": "[Image]" или "[Image] какой-то caption",
  "type": "image",
  "media": {
    "mimetype": "image/jpeg",
    "filename": "photo.jpg",
    "base64": "AAAA...."
  }
}
```

Текущий код использует `data.text` напрямую, сохраняя `[Image]` как текст сообщения вместо реального файла.

### Решение

#### 1. Добавить функцию очистки плейсхолдеров

```typescript
function stripMediaPlaceholder(text: string | undefined): string {
  if (!text) return '';
  // Убираем [Image], [Video], [Audio], [Document], [File], [Sticker], [Voice]
  return text
    .replace(/^\[(Image|Video|Audio|Document|File|Sticker|Voice|Media)\]\s*/i, '')
    .trim();
}
```

#### 2. Изменить построение текста сообщения

**Было (строка 329):**
```typescript
const messageText = data.text || data.body || (fileUrl ? `[${fileType || 'Media'}]` : '')
```

**Станет:**
```typescript
// Если есть медиа, очищаем плейсхолдеры из текста
const rawText = data.text || data.body || '';
const cleanText = data.media ? stripMediaPlaceholder(rawText) : rawText;
// Плейсхолдер только если нет ни текста, ни медиа
const messageText = cleanText || (fileUrl ? '' : '');
```

#### 3. Улучшить логирование ошибок загрузки

Добавить проверку существования бакета и более детальные ошибки:

```typescript
if (uploadError) {
  console.error('[wpp-webhook] Storage upload error:', {
    message: uploadError.message,
    hint: uploadError.message.includes('not found') 
      ? 'Bucket "chat-media" may not exist. Create it in Supabase Storage.' 
      : undefined
  });
}
```

### Файл для изменения

`supabase/functions/wpp-webhook/index.ts`

### После изменений

На self-hosted сервере (`api.academyos.ru`):
```bash
# Копировать файл
# Перезапустить
docker compose restart functions
```

### Проверка бакета на self-hosted

Если медиа не сохраняется, проверить что бакет `chat-media` создан:
```sql
-- В supabase postgres
SELECT * FROM storage.buckets WHERE id = 'chat-media';
```

Если нет — создать через dashboard или SQL:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true);
```

### Ожидаемый результат

| До | После |
|----|-------|
| `[Image]` в тексте, `file_url: null` | Пустой текст (или caption), `file_url: https://...` |
| `[Image] фото с отпуска` | `фото с отпуска`, `file_url: https://...` |
