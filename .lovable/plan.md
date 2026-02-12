

## Диагностика: Изображения из Wappi не загружаются

### Найденная проблема

В файле `src/hooks/useWhatsAppFile.ts` (строка 23) отсутствует обработка провайдера `'wappi'`. Код обрабатывает только два случая:

- `'wpp'` -- вызывает `wpp-download`
- Все остальное (включая `'wappi'`) -- вызывает `download-whatsapp-file` (GreenAPI)

```text
provider === 'wpp'  -->  wpp-download          (правильно)
provider === 'wappi' --> download-whatsapp-file (НЕПРАВИЛЬНО, должен быть wappi-whatsapp-download)
```

Это значит, что при попытке загрузить изображение из Wappi вызывается функция GreenAPI с неправильным форматом тела запроса, и загрузка всегда завершается ошибкой.

### Вторая проблема

Формат тела запроса для `wappi-whatsapp-download` -- `{ messageId, organizationId }`, но в текущем коде для не-WPP провайдеров отправляется `{ chatId, idMessage: messageId }` (формат GreenAPI).

### План исправления

**Файл: `src/hooks/useWhatsAppFile.ts`**

Добавить обработку провайдера `'wappi'`:

1. Если `provider === 'wappi'` -- вызывать функцию `wappi-whatsapp-download` с телом `{ messageId, organizationId }`
2. Если `provider === 'wpp'` -- вызывать `wpp-download` (как сейчас)
3. Иначе -- вызывать `download-whatsapp-file` для GreenAPI (как сейчас)

### Технические детали

Изменение затрагивает только один файл. Логика выбора функции и формата тела запроса будет расширена на три варианта вместо двух:

```text
provider === 'wappi' --> functionName: 'wappi-whatsapp-download', body: { messageId, organizationId }
provider === 'wpp'   --> functionName: 'wpp-download',             body: { messageId, organizationId }
default (greenapi)   --> functionName: 'download-whatsapp-file',    body: { chatId, idMessage: messageId }
```

