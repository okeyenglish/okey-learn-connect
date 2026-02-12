

## Исправление перемешивания имён менеджеров

### Корневая причина

На self-hosted базе колонка `sender_name` в таблице `chat_messages` может отсутствовать. При вставке сообщения:
- Функции `whatsapp-send` и `wappi-whatsapp-send` передают `sender_name: payload.senderName`, но **НЕ дублируют** имя в поле `metadata`
- Self-hosted PostgREST молча игнорирует несуществующую колонку
- Имя менеджера теряется, и UI показывает "Менеджер поддержки" или подставляет имя от другого сообщения

Другие функции (`wpp-send`, `telegram-send`, `max-send`, `telegram-crm-send`) уже имеют дублирование в `metadata: { sender_name: ... }` -- поэтому там проблема не возникает.

### Решение

#### 1. `supabase/functions/whatsapp-send/index.ts`

Добавить `metadata: { sender_name: payload.senderName || null }` в insert-запрос, аналогично тому как это уже сделано в `wpp-send` и `telegram-send`.

#### 2. `supabase/functions/wappi-whatsapp-send/index.ts`

Аналогично добавить `metadata: { sender_name: body.senderName || null }` в insert-запрос.

### Что это даст

- Имя менеджера будет всегда сохранено в `metadata.sender_name` даже если колонка `sender_name` отсутствует
- UI уже умеет читать из `metadata.sender_name` (строка 860 в ChatArea.tsx): `msg.sender_name || (meta as any)?.sender_name || 'Менеджер поддержки'`
- Новые сообщения будут корректно показывать имя отправившего менеджера
- Старые сообщения без имени останутся как "Менеджер поддержки" (их данные уже утеряны)

### Файлы для изменения

- `supabase/functions/whatsapp-send/index.ts` -- добавить 1 строку metadata в insert
- `supabase/functions/wappi-whatsapp-send/index.ts` -- добавить 1 строку metadata в insert

