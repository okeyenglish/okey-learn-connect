
## План: Исправление отображения медиафайлов WPP

### Проблема

Медиафайлы (изображения, видео, аудио) не отображаются в чате для входящих сообщений WhatsApp через WPP.

### Диагностика

1. **wpp-webhook** сохранял `file_type` как просто 'image' вместо полного MIME-типа 'image/jpeg'
2. **wpp-download** возвращал blob вместо `{downloadUrl: string}`, что несовместимо с фронтендом
3. Компонент `OptimizedAttachedFile` не мог определить тип файла и показывал плейсхолдер

### Исправления

#### 1. `supabase/functions/wpp-webhook/index.ts`

**Строка 290-293** - сохранять полный MIME-тип:

```typescript
// Было:
fileType = media.mimetype ? getFileTypeFromMime(media.mimetype) : null
fileName = media.filename || `${fileType || 'file'}_${Date.now()}`

// Стало:
fileType = media.mimetype || null  // Сохраняем реальный MIME-тип
const fileCategory = media.mimetype ? getFileTypeFromMime(media.mimetype) : 'file'
fileName = media.filename || `${fileCategory}_${Date.now()}`
```

#### 2. `supabase/functions/wpp-download/index.ts`

Полностью переписана функция:
- Сначала ищет `file_url` в базе данных (файлы уже сохранены wpp-webhook)
- Если не найдено, скачивает с WPP API и сохраняет в Storage
- Возвращает `{downloadUrl: string}` вместо blob

### Развёртывание на Self-Hosted

**Скопировать обновлённые функции:**

```bash
# Скопировать файлы на сервер
scp supabase/functions/wpp-webhook/index.ts server:/path/to/functions/wpp-webhook/
scp supabase/functions/wpp-download/index.ts server:/path/to/functions/wpp-download/

# Перезапустить functions контейнер
docker compose restart functions
```

**Создать Storage bucket (если не существует):**

```sql
-- Выполнить в SQL редакторе Supabase
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- RLS политики для публичного доступа
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-media');

CREATE POLICY "Service role write access" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat-media');
```

### Ожидаемый результат

После исправлений:
- Новые входящие медиафайлы будут сохраняться с правильным MIME-типом
- Компонент `OptimizedAttachedFile` корректно определит тип и покажет превью
- При ошибке загрузки файл будет скачан с WPP API и сохранён в Storage

---

## Предыдущее: Исправление реакций на сообщения

✅ Выполнено. Убрана колонка `user_type` из upsert операций в `useBatchMessageReactions.ts` и `useMessageReactions.ts`.
