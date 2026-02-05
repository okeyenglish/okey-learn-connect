

## Исправление: Обработка медиа-сообщений в wpp-webhook

### Проблема

Логи показывают:
```
[wpp-webhook][v2.5.2] Event type: image Account: 0000000000009
[wpp-webhook] Unhandled event type: image
```

Медиа-сообщения приходят с `type: "image"`, `type: "file"` и т.д., но эти типы не обрабатываются в switch — они попадают в `default` case.

### Текущая структура входящих медиа

```json
{
  "account": "0000000000009",
  "from": "+79852615056",
  "type": "image",
  "media": {
    "mimetype": "image/jpeg",
    "filename": "file",
    "base64": "/9j/4AAQSkZJRgABAQ..."
  }
}
```

### План исправления

#### Файл: `supabase/functions/wpp-webhook/index.ts`

**1. Обновить интерфейс WppWebhookPayload (строки 45-49)**

Добавить поле `base64` в media:

```typescript
media?: {
  url?: string;
  mimetype?: string;
  filename?: string;
  base64?: string;  // НОВОЕ: base64-encoded файл
};
```

**2. Добавить обработку медиа-типов в switch (после строки 205)**

Добавить новые case для медиа:

```typescript
case 'image':
case 'file':
case 'audio':
case 'video':
case 'document':
case 'ptt':  // push-to-talk (голосовые)
case 'sticker':
  // Медиа-сообщения обрабатываются как входящие
  console.log(`[wpp-webhook] Processing media type: ${eventType}`)
  if (isFlatMessage) {
    await handleIncomingMessage(payload, organizationId)
  } else {
    await handleIncomingMessage(payload.data || payload, organizationId)
  }
  break
```

**3. Обновить handleIncomingMessage для сохранения base64 в Storage (строки 245-440)**

Добавить логику сохранения медиа из base64:

```typescript
async function handleIncomingMessage(data: WppWebhookPayload, organizationId: string) {
  // ... существующий код ...

  let fileUrl: string | null = null;
  let fileName: string | null = null;
  let fileType: string | null = null;

  // Обработка медиа
  if (data.media) {
    const media = data.media;
    fileType = media.mimetype ? getFileTypeFromMime(media.mimetype) : null;
    fileName = media.filename || `${fileType}_${Date.now()}`;

    // Если есть base64, сохраняем в Storage
    if (media.base64) {
      try {
        const base64Data = media.base64;
        const buffer = Uint8Array.from(
          atob(base64Data),
          c => c.charCodeAt(0)
        );

        const ext = getExtensionFromMime(media.mimetype || 'application/octet-stream');
        const storagePath = `wpp/${organizationId}/${Date.now()}_${fileName}.${ext}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(storagePath, buffer, {
            contentType: media.mimetype || 'application/octet-stream',
            upsert: false,
          });

        if (uploadError) {
          console.error('[wpp-webhook] Storage upload error:', uploadError.message);
        } else {
          // Получаем публичный URL
          const { data: publicUrl } = supabase.storage
            .from('chat-media')
            .getPublicUrl(storagePath);
          fileUrl = publicUrl.publicUrl;
          console.log('[wpp-webhook] ✅ Media saved to storage:', fileUrl);
        }
      } catch (e) {
        console.error('[wpp-webhook] Error processing base64:', e);
      }
    } else if (media.url) {
      // Если есть URL, используем его напрямую
      fileUrl = media.url;
    }
  }

  // ... далее использовать fileUrl, fileName, fileType при сохранении сообщения ...
}
```

**4. Добавить вспомогательную функцию getExtensionFromMime**

```typescript
function getExtensionFromMime(mime: string): string {
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/3gpp': '3gp',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  };
  return mimeMap[mime] || 'bin';
}
```

### Создание Storage bucket (если не существует)

Нужно создать bucket `chat-media` для хранения медиа-файлов:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- RLS политика для публичного чтения
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-media');

-- RLS политика для записи через service role
CREATE POLICY "Service role can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-media');
```

### Технические детали

| Тип события | Действие |
|------------|----------|
| `image` | Сохранить base64 в Storage → URL в chat_messages |
| `file` | Сохранить base64 в Storage → URL в chat_messages |
| `audio` | Сохранить base64 в Storage → URL в chat_messages |
| `video` | Сохранить base64 в Storage → URL в chat_messages |
| `ptt` | Голосовое сообщение → аналогично audio |
| `sticker` | Стикер как изображение |

### Изменяемые файлы

| Файл | Изменения |
|------|-----------|
| `supabase/functions/wpp-webhook/index.ts` | Добавить case для медиа-типов, обновить handleIncomingMessage для base64 |

### Ожидаемый результат

1. Медиа-сообщения (image, file, audio, video) будут обрабатываться
2. Base64-данные будут сохраняться в Supabase Storage
3. URL файлов будут записываться в `chat_messages.file_url`
4. Медиа будут отображаться в CRM чате

