

## Авто-реактивация и склейка клиентов при входящем сообщении

### Проблема

Когда деактивированный клиент пишет в Telegram, вебхук находит его неактивную запись и сохраняет сообщение туда. Клиент не виден в списке чатов (`is_active = false`). Если при этом существует активный дубликат с тем же `telegram_user_id` -- данные разъезжаются.

### Решение

Единая логика приоритизации во всех трёх точках поиска клиентов:

```text
1. Ищем АКТИВНОГО клиента по telegram_user_id/chat_id
   -> Найден? Используем его.
2. Ищем ЛЮБОГО клиента (включая неактивных)
   -> Найден неактивный?
      -> Есть активный дубликат (по телефону/имени)?
         -> Да: склеиваем (mergeClients), используем активного
         -> Нет: реактивируем (is_active = true)
3. Не найден -> создаём нового
```

### Затрагиваемые файлы и изменения

#### 1. `supabase/functions/telegram-webhook/index.ts` -- `findOrCreateClient` (строки 1052-1070)

После вызова RPC `find_or_create_telegram_client` добавить проверку: если вернулся клиент с `is_active = false`, проверить наличие активного дубликата и либо склеить, либо реактивировать.

#### 2. `supabase/functions/telegram-webhook/index.ts` -- `findOrCreateClientLegacy` (строки 1143-1155)

В поиске по `telegram_chat_id` добавить приоритизацию:
- Сначала искать с `.eq('is_active', true)`
- Если не найден -- искать без фильтра
- Найден неактивный: проверить есть ли активный дубликат -> склеить или реактивировать

#### 3. `supabase/functions/telegram-webhook/index.ts` -- `handleOutgoingMessage` (строки 693-698)

Добавить `.eq('is_active', true)` в первый запрос. Если не найден -- fallback без фильтра с реактивацией.

#### 4. SQL-миграция для RPC `find_or_create_telegram_client`

Обновить RPC-функцию на self-hosted:
- Шаг 1: искать с `AND is_active = true`
- Шаг 2: если не найден -- искать без фильтра `is_active`
- Шаг 3: если найден неактивный -- проверить наличие активного дубликата по телефону
  - Есть активный дубликат: перенести `telegram_user_id` на активного, деактивировать старого
  - Нет активного дубликата: реактивировать (`UPDATE is_active = true`)

#### 5. Логика склейки в `mergeClients` (строки 962-1003)

Существующая функция `mergeClients` уже переносит сообщения и деактивирует дубликат. Нужно дополнить:
- Также переносить `telegram_user_id` и `telegram_chat_id`
- Обновить `is_active = false` (сейчас обновляет только `status = 'merged'`)
- Перенести `family_members` связи

### Пример изменения в `findOrCreateClient`

После получения `clientId` из RPC, перед return:

```text
// Проверяем is_active
const { data: clientRow } = await supabase
  .from('clients')
  .select('id, is_active, phone, name')
  .eq('id', clientId)
  .single();

if (clientRow && !clientRow.is_active) {
  // Ищем активного дубликата
  const { data: activedup } = await supabase
    .from('clients')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .or(`telegram_user_id.eq.${telegramUserId},...phone filter...`)
    .neq('id', clientId)
    .limit(1);

  if (activedup && activedup.length > 0) {
    // Склеиваем: переносим сообщения на активного
    await mergeClients(supabase, activedup[0].id, clientId, ...);
    clientId = activedup[0].id;
  } else {
    // Реактивируем
    await supabase.from('clients')
      .update({ is_active: true })
      .eq('id', clientId);
  }
}
```

### Порядок реализации

1. Обновить `findOrCreateClient` -- добавить проверку `is_active` после RPC
2. Обновить `findOrCreateClientLegacy` -- приоритизация активных
3. Обновить `handleOutgoingMessage` -- фильтр `is_active = true`
4. Дополнить `mergeClients` -- полная деактивация дубликата
5. SQL-миграция для RPC `find_or_create_telegram_client`
6. Деплой `telegram-webhook`

