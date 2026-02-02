
# План: Неограниченное количество инстансов для каждого мессенджера

## Обзор

Реализация поддержки множественных интеграций для WhatsApp (Green API, Wappi, WPP), Telegram (Wappi) и MAX (Green API) с единой удобной панелью управления в админке.

## Текущая архитектура

```text
┌─────────────────────────────────────┐
│     messenger_settings              │
├─────────────────────────────────────┤
│ organization_id + messenger_type    │
│ → Только 1 интеграция на тип        │
│ → Все credentials в одном JSONB     │
└─────────────────────────────────────┘
```

## Целевая архитектура

```text
┌─────────────────────────────────────────────────────────────────┐
│     messenger_integrations (НОВАЯ ТАБЛИЦА)                      │
├─────────────────────────────────────────────────────────────────┤
│ id: UUID (PK)                                                   │
│ organization_id: UUID                                           │
│ messenger_type: 'whatsapp' | 'telegram' | 'max'                 │
│ provider: 'green_api' | 'wappi' | 'wpp'                         │
│ name: "WhatsApp Основной", "WhatsApp Продажи"                   │
│ is_primary: boolean (один primary на org+type)                  │
│ is_enabled: boolean                                             │
│ webhook_key: unique random string (для идентификации вебхука)   │
│ settings: JSONB (instanceId, apiToken, etc.)                    │
│ priority: integer (порядок fallback)                            │
│ phone_label: "+7 999 123-45-67" (отображение номера)            │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│     chat_messages (обновлённая)                                 │
├─────────────────────────────────────────────────────────────────┤
│ integration_id: UUID (NEW) → Привязка к конкретной интеграции   │
└─────────────────────────────────────────────────────────────────┘
```

## Логика маршрутизации сообщений

```text
ОТПРАВКА СООБЩЕНИЯ:

1. Ответ на входящее?
   ├── ДА → Найти integration_id последнего входящего от клиента
   │        → Отправить через ту же интеграцию
   │
   └── НЕТ (новый диалог) → Использовать primary интеграцию

2. Попытка отправки
   ├── Успех → Сохранить с integration_id
   │
   └── Ошибка → Попробовать следующую по priority
               → Перебрать все активные
               → Все неудачно → Статус 'failed'
```

## Фаза 1: База данных

### 1.1 Создание таблицы `messenger_integrations`

```sql
CREATE TABLE messenger_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  messenger_type TEXT NOT NULL CHECK (messenger_type IN ('whatsapp', 'telegram', 'max')),
  provider TEXT NOT NULL, -- 'green_api', 'wappi', 'wpp'
  name TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  is_enabled BOOLEAN DEFAULT true,
  webhook_key TEXT UNIQUE NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  priority INTEGER DEFAULT 100,
  phone_label TEXT, -- Для отображения "+7 999 123-45-67"
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Только один primary на organization + messenger_type
CREATE UNIQUE INDEX idx_primary_integration 
  ON messenger_integrations(organization_id, messenger_type) 
  WHERE is_primary = true;

-- Индекс для быстрого поиска по webhook_key
CREATE INDEX idx_integration_webhook_key ON messenger_integrations(webhook_key);

-- RLS политики
ALTER TABLE messenger_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org integrations"
  ON messenger_integrations FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage integrations"
  ON messenger_integrations FOR ALL
  USING (is_admin() AND organization_id = get_user_organization_id());

CREATE POLICY "Service role full access"
  ON messenger_integrations FOR ALL
  USING (true);
```

### 1.2 Изменение таблицы `chat_messages`

```sql
ALTER TABLE chat_messages 
ADD COLUMN integration_id UUID REFERENCES messenger_integrations(id);

CREATE INDEX idx_messages_integration 
  ON chat_messages(client_id, messenger, direction, created_at DESC)
  WHERE integration_id IS NOT NULL;
```

### 1.3 Миграция данных

```sql
-- Перенос существующих настроек WhatsApp
INSERT INTO messenger_integrations (
  organization_id, messenger_type, provider, name, 
  is_primary, webhook_key, settings, is_enabled
)
SELECT 
  organization_id,
  'whatsapp',
  CASE 
    WHEN settings->>'provider' = 'wappi' THEN 'wappi'
    WHEN settings->>'provider' = 'wpp' THEN 'wpp'
    ELSE 'green_api'
  END,
  'WhatsApp (основной)',
  true,
  encode(gen_random_bytes(12), 'hex'),
  settings,
  is_enabled
FROM messenger_settings
WHERE messenger_type = 'whatsapp';

-- Аналогично для telegram и max
```

## Фаза 2: Edge Functions — Вебхуки

### 2.1 Новый формат URL вебхуков

```text
Старый: /functions/v1/whatsapp-webhook
Новый:  /functions/v1/whatsapp-webhook?key=UNIQUE_WEBHOOK_KEY
```

### 2.2 Обновление вебхук-функций

**Файлы для изменения:**
- `supabase/functions/whatsapp-webhook/index.ts`
- `supabase/functions/wappi-whatsapp-webhook/index.ts`
- `supabase/functions/wpp-webhook/index.ts`
- `supabase/functions/telegram-webhook/index.ts`
- `supabase/functions/max-webhook/index.ts`

**Новая логика:**

```typescript
// Получить webhook_key из URL
const url = new URL(req.url);
const webhookKey = url.searchParams.get('key');

// Найти интеграцию
const { data: integration } = await supabase
  .from('messenger_integrations')
  .select('id, organization_id, settings, is_enabled')
  .eq('webhook_key', webhookKey)
  .single();

// Fallback на старую логику (по instanceId) для обратной совместимости
if (!integration) {
  // Существующая логика поиска по instanceId
}

// Сохранить сообщение с integration_id
await supabase.from('chat_messages').insert({
  ...messageData,
  integration_id: integration.id
});
```

## Фаза 3: Edge Functions — Отправка с Fallback

### 3.1 Создание shared-функции для выбора интеграции

**Новый файл: `supabase/functions/_shared/integration-resolver.ts`**

```typescript
export async function getIntegrationsForSend(
  supabase: SupabaseClient,
  organizationId: string,
  clientId: string,
  messengerType: 'whatsapp' | 'telegram' | 'max',
  specificIntegrationId?: string
): Promise<string[]> {
  const integrationIds: string[] = [];
  
  // 1. Если указан конкретный integration_id
  if (specificIntegrationId) {
    integrationIds.push(specificIntegrationId);
  }
  
  // 2. Найти integration_id последнего входящего сообщения
  const { data: lastIncoming } = await supabase
    .from('chat_messages')
    .select('integration_id')
    .eq('client_id', clientId)
    .eq('messenger', messengerType)
    .eq('direction', 'incoming')
    .not('integration_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (lastIncoming?.integration_id && !integrationIds.includes(lastIncoming.integration_id)) {
    integrationIds.push(lastIncoming.integration_id);
  }
  
  // 3. Добавить primary интеграцию
  const { data: primary } = await supabase
    .from('messenger_integrations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('messenger_type', messengerType)
    .eq('is_primary', true)
    .eq('is_enabled', true)
    .maybeSingle();
  
  if (primary?.id && !integrationIds.includes(primary.id)) {
    integrationIds.push(primary.id);
  }
  
  // 4. Добавить остальные активные (по priority)
  const { data: others } = await supabase
    .from('messenger_integrations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('messenger_type', messengerType)
    .eq('is_enabled', true)
    .order('priority', { ascending: true });
  
  for (const integration of others || []) {
    if (!integrationIds.includes(integration.id)) {
      integrationIds.push(integration.id);
    }
  }
  
  return integrationIds;
}

export async function sendWithFallback(
  supabase: SupabaseClient,
  integrationIds: string[],
  sendFn: (settings: any) => Promise<{ success: boolean; messageId?: string; error?: string }>
): Promise<{ success: boolean; integrationId?: string; messageId?: string; error?: string }> {
  
  for (const integrationId of integrationIds) {
    const { data: integration } = await supabase
      .from('messenger_integrations')
      .select('id, settings, provider')
      .eq('id', integrationId)
      .eq('is_enabled', true)
      .single();
    
    if (!integration) continue;
    
    try {
      const result = await sendFn(integration);
      
      if (result.success) {
        // Очистить ошибку если была
        await supabase
          .from('messenger_integrations')
          .update({ last_error: null, last_error_at: null })
          .eq('id', integrationId);
        
        return { 
          success: true, 
          integrationId, 
          messageId: result.messageId 
        };
      }
      
      // Записать ошибку
      await supabase
        .from('messenger_integrations')
        .update({ 
          last_error: result.error, 
          last_error_at: new Date().toISOString() 
        })
        .eq('id', integrationId);
      
    } catch (error) {
      console.error(`Integration ${integrationId} failed:`, error);
    }
  }
  
  return { success: false, error: 'All integrations failed' };
}
```

### 3.2 Обновление send-функций

**Файлы для изменения:**
- `supabase/functions/whatsapp-send/index.ts`
- `supabase/functions/wappi-whatsapp-send/index.ts`
- `supabase/functions/wpp-send/index.ts`
- `supabase/functions/telegram-send/index.ts`
- `supabase/functions/max-send/index.ts`

**Пример обновлённой логики:**

```typescript
// Получить список интеграций для отправки
const integrationIds = await getIntegrationsForSend(
  supabase, organizationId, clientId, 'whatsapp'
);

// Отправить с fallback
const result = await sendWithFallback(supabase, integrationIds, async (integration) => {
  const settings = integration.settings;
  // ... отправка через конкретный провайдер
});

// Сохранить сообщение с integration_id
if (result.success) {
  await supabase.from('chat_messages').insert({
    ...messageData,
    integration_id: result.integrationId
  });
}
```

## Фаза 4: Frontend — ChatArea

### 4.1 Обновление `src/components/crm/ChatArea.tsx`

**Изменения:**
1. Получение `integration_id` из последнего входящего сообщения
2. Передача `integration_id` в API отправки
3. Отображение информации об интеграции (опционально)

```typescript
// При отправке сообщения
const getIntegrationId = async (messengerType: string): Promise<string | null> => {
  const { data } = await supabase
    .from('chat_messages')
    .select('integration_id')
    .eq('client_id', clientId)
    .eq('messenger', messengerType)
    .eq('direction', 'incoming')
    .not('integration_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  return data?.integration_id || null;
};
```

## Фаза 5: Админ-панель — UI управления интеграциями

### 5.1 Новый компонент `IntegrationsList.tsx`

```text
┌─────────────────────────────────────────────────────────────────────┐
│  WhatsApp                                               [+ Добавить] │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ ☰  📱 WhatsApp Основной           ✓ Подключён     ★ Главный    │ │
│  │     Green API • +7 (999) 123-45-67                              │ │
│  │     Webhook: .../whatsapp-webhook?key=abc123...   [📋]          │ │
│  │     [Настроить] [Удалить]                                        │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ ☰  📱 WhatsApp Продажи            ✓ Подключён                   │ │
│  │     Wappi.pro • +7 (999) 987-65-43                              │ │
│  │     Webhook: .../wappi-whatsapp-webhook?key=def456...   [📋]    │ │
│  │     [Настроить] [Сделать главным] [Удалить]                      │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ ☰  📱 WhatsApp Self-hosted        ⚠ Ошибка                      │ │
│  │     WPP Connect • +7 (999) 555-55-55                            │ │
│  │     Ошибка: Instance not authorized (5 мин назад)               │ │
│  │     [Настроить] [Удалить]                                        │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ☰ — Drag-and-drop для изменения приоритета fallback                │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Новые файлы компонентов

| Файл | Описание |
|------|----------|
| `src/components/admin/integrations/IntegrationsList.tsx` | Список всех интеграций мессенджера |
| `src/components/admin/integrations/IntegrationCard.tsx` | Карточка одной интеграции |
| `src/components/admin/integrations/AddIntegrationDialog.tsx` | Модалка добавления |
| `src/components/admin/integrations/EditIntegrationDialog.tsx` | Модалка редактирования |
| `src/components/admin/integrations/ProviderSelector.tsx` | Выбор провайдера (Green API / Wappi / WPP) |
| `src/hooks/useMessengerIntegrations.ts` | Hook для CRUD интеграций |

### 5.3 Обновление `MessengersSettings.tsx`

Заменить текущие компоненты настроек (WhatsAppSettings, TelegramWappiSettings, MaxGreenApiSettings) на новый унифицированный UI с `IntegrationsList`.

### 5.4 Функционал UI

1. **Добавление интеграции:**
   - Выбор типа мессенджера
   - Выбор провайдера
   - Ввод credentials
   - Автогенерация webhook_key
   - Показ webhook URL для копирования

2. **Редактирование:**
   - Изменение имени
   - Обновление credentials
   - Включение/отключение

3. **Управление приоритетом:**
   - Drag-and-drop для изменения порядка
   - Выбор главной интеграции (is_primary)

4. **Мониторинг:**
   - Статус подключения (online/offline/error)
   - Последняя ошибка и время
   - Быстрая проверка соединения

## Файлы для изменения

| Категория | Файлы |
|-----------|-------|
| **База данных** | Миграция SQL |
| **Shared** | `supabase/functions/_shared/integration-resolver.ts` (новый) |
| **Вебхуки** | `whatsapp-webhook`, `wappi-whatsapp-webhook`, `wpp-webhook`, `telegram-webhook`, `max-webhook` |
| **Отправка** | `whatsapp-send`, `wappi-whatsapp-send`, `wpp-send`, `telegram-send`, `max-send` |
| **Frontend** | `ChatArea.tsx`, `MessengersSettings.tsx` |
| **Новые компоненты** | `IntegrationsList.tsx`, `IntegrationCard.tsx`, `AddIntegrationDialog.tsx`, `EditIntegrationDialog.tsx` |
| **Hooks** | `useMessengerIntegrations.ts` (новый), `useMessengerIntegrationStatus.ts` (обновить) |

## Обратная совместимость

1. **Старые вебхуки без ?key=** — fallback на поиск по instanceId (как сейчас)
2. **Сообщения без integration_id** — при отправке используется primary интеграция
3. **Миграция** — существующие настройки автоматически переносятся как primary

## Оценка трудозатрат

| Фаза | Описание | Время |
|------|----------|-------|
| 1 | База данных + миграция | 2-3 часа |
| 2 | Обновление 5 вебхуков | 3-4 часа |
| 3 | Обновление 5 send-функций | 4-5 часов |
| 4 | ChatArea + маршрутизация | 2-3 часа |
| 5 | Админ-панель UI | 6-8 часов |
| **Итого** | | **17-23 часа** |
