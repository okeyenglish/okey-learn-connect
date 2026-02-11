
# Исправление: изображения из Wappi приходят некорректно

## Проблема

Wappi отправляет в поле `body` для изображений только **миниатюру (thumbnail)** в base64, а не полное изображение. Пример из документации: `"/9j/4AAQSkZNQ5JDP/9k="` -- это ~15 байт, что является невалидным JPEG. Вебхук сейчас пытается загрузить этот крошечный base64 в хранилище, результат -- битый файл или ошибка загрузки. Поэтому в чате отображается `[Изображение]` вместо реальной картинки.

Для получения полного медиафайла нужно вызывать отдельный Wappi API: `GET /api/sync/message/media/download?profile_id=X&message_id=Y`

## Решение

Модифицировать вебхук `wappi-whatsapp-webhook`, чтобы для медиа-сообщений (image, video, audio, document) он:
1. Сначала пытался скачать полный файл через Wappi Media Download API
2. Только если скачивание не удалось -- использовал `body` base64 как fallback
3. Загружал полученный файл в хранилище и сохранял постоянную ссылку

## Технические детали

### Файл: `supabase/functions/wappi-whatsapp-webhook/index.ts`

#### 1. Новая функция `getWappiCredentials`
Получает `profileId` и `apiToken` из таблицы `messenger_integrations` (или `messenger_settings` как fallback) по `organizationId`. Эти данные нужны для вызова Wappi API.

#### 2. Новая функция `downloadFullMedia`
```
downloadFullMedia(profileId, apiToken, messageId, mimeType, orgId) -> string | null
```
- Вызывает `https://wappi.pro/api/sync/message/media/download?profile_id=X&message_id=Y`
- Получает бинарные данные или JSON с URL/base64
- Загружает в бакет `chat-media` в хранилище
- Возвращает публичный URL

#### 3. Изменение логики в `handleIncomingMessage` (строки 481-488)
Вместо:
```
if (message.body && message.type !== 'chat') {
  uploadedUrl = await uploadWappiMedia(message.body, ...)
}
```

Новая логика:
```
if (message.type !== 'chat') {
  // 1. Попробовать скачать полный файл через API
  const credentials = await getWappiCredentials(organizationId)
  if (credentials) {
    fileUrl = await downloadFullMedia(credentials.profileId, credentials.apiToken, message.id, message.mimetype, organizationId)
  }
  // 2. Fallback: использовать body base64 (если он достаточно большой - >1KB)
  if (!fileUrl && message.body && message.body.length > 1000) {
    fileUrl = await uploadWappiMedia(message.body, message.id, message.mimetype, organizationId)
  }
}
```

#### 4. Аналогичное изменение в `handleOutgoingMessage` (строки 699-704)
Та же логика для исходящих сообщений с телефона.

#### 5. Исправление `btoa` в `wappi-whatsapp-download/index.ts` (строка 166)
Текущий код `btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))` может вызывать stack overflow на больших файлах. Заменить на chunked подход.

### Проверка размера base64
Добавляется проверка `message.body.length > 1000` перед fallback на body base64, чтобы не загружать заведомо битые миниатюры (как в примере из документации - 18 символов).
