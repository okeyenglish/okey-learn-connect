
# План: Роутинг ответов через профиль, на который клиент написал

## Текущая проблема

Сейчас при ответе клиенту система всегда использует **primary** (основной) профиль Telegram CRM, независимо от того, на какой профиль клиент изначально написал. Это приводит к ситуации, когда клиенты пишут на разные профили, но ответы уходят только с одного.

## Решение

Внедрить "умный роутинг" ответов: сохранять ID интеграции при получении сообщения и использовать эту же интеграцию для ответа.

---

## Технические изменения

### 1. Webhook: Сохранение integration_id в сообщение и клиента

**Файл:** `supabase/functions/telegram-crm-webhook/index.ts`

При получении входящего сообщения:
- Запрашиваем **id** интеграции вместе с organization_id
- Сохраняем `integration_id` в запись `chat_messages`
- Обновляем клиента: сохраняем `telegram_integration_id` (последняя интеграция, через которую клиент писал)

```
Текущий SELECT: 'organization_id, settings'
Новый SELECT: 'id, organization_id, settings'
```

### 2. Функция отправки: Приоритет интеграции клиента

**Файл:** `supabase/functions/telegram-crm-send/index.ts`

Изменить логику выбора интеграции:

```text
ТЕКУЩАЯ ЛОГИКА:
1. Если передан integrationId — используем его
2. Иначе — берём primary интеграцию

НОВАЯ ЛОГИКА:
1. Если передан integrationId — используем его
2. Иначе — проверяем последнее входящее сообщение от клиента
   → Если есть integration_id — используем его (ответ через тот же профиль)
3. Если нет истории — берём primary интеграцию
4. Fallback: если выбранная интеграция отключена — пробуем другие активные
```

### 3. База данных: Новые поля для отслеживания

#### Колонка `integration_id` в `chat_messages`
На self-hosted уже есть. Нужно убедиться, что webhook использует его.

#### Колонка `telegram_integration_id` в `clients` 
Опционально: для кеширования "последней использованной интеграции" клиента.
Если колонка отсутствует — искать по последнему сообщению от клиента.

---

## Алгоритм определения интеграции для ответа

```text
function getIntegrationForReply(clientId):
    
    // 1. Найти последнее ВХОДЯЩЕЕ сообщение от клиента через telegram_crm
    lastIncoming = SELECT integration_id FROM chat_messages 
                   WHERE client_id = clientId 
                   AND is_outgoing = false 
                   AND messenger_type = 'telegram'
                   ORDER BY created_at DESC LIMIT 1
    
    // 2. Проверить, активна ли эта интеграция
    if (lastIncoming.integration_id):
        integration = SELECT * FROM messenger_integrations 
                      WHERE id = lastIncoming.integration_id
                      AND is_enabled = true
        if (integration): return integration
    
    // 3. Fallback: primary интеграция
    return SELECT * FROM messenger_integrations
           WHERE organization_id = orgId
           AND messenger_type = 'telegram'
           AND provider = 'telegram_crm'
           AND is_primary = true
           AND is_enabled = true
```

---

## Изменения в коде

### telegram-crm-webhook/index.ts

```typescript
// Изменение 1: Запрашиваем id интеграции
const { data: integration } = await supabase
  .from('messenger_integrations')
  .select('id, organization_id, settings')  // Добавлен 'id'
  .eq('webhook_key', webhookKey)
  ...

const integrationId = integration.id;  // Сохраняем

// Изменение 2: Добавляем integration_id в сообщение
const { data: savedMessage } = await supabase
  .from('chat_messages')
  .insert({
    ...
    integration_id: integrationId,  // Новое поле
  })
```

### telegram-crm-send/index.ts

```typescript
// Изменение: Новая логика выбора интеграции
let integration;

if (integrationId) {
  // Явно указана интеграция
  integration = await getIntegrationById(integrationId);
} else {
  // Ищем по последнему входящему сообщению от клиента
  const { data: lastMessage } = await supabase
    .from('chat_messages')
    .select('integration_id')
    .eq('client_id', clientId)
    .eq('is_outgoing', false)
    .eq('messenger_type', 'telegram')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastMessage?.integration_id) {
    integration = await getActiveIntegration(lastMessage.integration_id);
  }
  
  // Fallback: primary
  if (!integration) {
    integration = await getPrimaryIntegration(organizationId);
  }
}
```

---

## Результат

После изменений:
- Клиент пишет на профиль "A" → сообщение сохраняется с `integration_id = A`
- Менеджер отвечает → система находит `integration_id = A` и отправляет через тот же профиль
- Клиент пишет на профиль "B" → следующие ответы пойдут через профиль "B"

---

## Совместимость

- **Обратная совместимость**: Если `integration_id` не найден — используется primary профиль (текущее поведение)
- **Self-hosted**: Колонка `integration_id` уже есть в схеме
- **Cloud**: Колонка отсутствует (другая схема), но эти функции используются только на self-hosted
