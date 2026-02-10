
# Исправление GreenAPI: цитирование и изображения

## Проблема 1: `[quotedMessage]` вместо текста цитаты

На скриншоте видно `[quotedMessage]` -- это происходит потому, что GreenAPI присылает `typeMessage: 'quotedMessage'` для цитированных сообщений, но в `switch` обработчике вебхука (`whatsapp-webhook/index.ts`) нет `case 'quotedMessage'`. Сообщение попадает в `default` и сохраняется как `[quotedMessage]`.

По документации GreenAPI, для `quotedMessage` текст ответа находится в `extendedTextMessageData.text`, а ID цитируемого сообщения в `extendedTextMessageData.stanzaId`.

### Исправление

В файле `supabase/functions/whatsapp-webhook/index.ts` добавить `case 'quotedMessage'` в оба `switch` блока (handleIncomingMessage ~строка 808 и handleOutgoingMessage ~строка 1038):

```typescript
case 'quotedMessage':
  messageText = messageData.extendedTextMessageData?.text || '';
  break;
```

Это нужно сделать в двух местах:
- В `handleIncomingMessage` (строка ~808, перед `case 'extendedTextMessage'`)
- В `handleOutgoingMessage` (строка ~1038, перед `default`)

## Проблема 2: Изображения не приходят

Изображения (`imageMessage`) обрабатываются в вебхуке, но `downloadUrl` от GreenAPI -- временная ссылка, которая быстро истекает. Вебхук вызывает `download-whatsapp-file` для получения постоянной ссылки, но если этот вызов фейлится, используется оригинальный `downloadUrl`, который потом перестает работать.

Нужно проверить логи, чтобы понять конкретную причину. Однако основная проблема может быть в том, что для `quotedMessage` с изображением (цитата картинки) -- файл вообще не обрабатывается, т.к. `case 'quotedMessage'` отсутствует.

Дополнительно: добавить обработку медиа-данных для `quotedMessage`, т.к. цитата может содержать файл:

```typescript
case 'quotedMessage':
  messageText = messageData.extendedTextMessageData?.text || '';
  // quotedMessage может содержать файл в fileMessageData
  if (messageData.fileMessageData?.downloadUrl) {
    fileUrl = messageData.fileMessageData.downloadUrl;
    fileName = messageData.fileMessageData?.fileName;
    fileType = messageData.fileMessageData?.mimeType;
  }
  break;
```

## Проблема 3: Отправка цитированных сообщений

Функция `whatsapp-send` (`sendTextMessage`) не поддерживает параметр `quotedMessageId`. По документации GreenAPI, для отправки ответа с цитированием нужно добавить `quotedMessageId` в тело запроса к `sendMessage` API.

Это отдельная задача для будущей реализации (UI для reply + передача `quotedMessageId`).

## Порядок реализации

1. Добавить `case 'quotedMessage'` в `handleIncomingMessage` (с поддержкой медиа)
2. Добавить `case 'quotedMessage'` в `handleOutgoingMessage`
3. Задеплоить обновленную функцию `whatsapp-webhook`
4. Проверить логи на предмет ошибок загрузки изображений
