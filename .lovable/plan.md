

# План: Импорт только клиентов без истории сообщений из Salebot

## Резюме

Функционал импорта только для клиентов без истории сообщений **уже реализован** в Edge Function (`sync_new_clients_only` режим), но **RPC функции отсутствуют на self-hosted инстансе**. Также нужно исправить привязку мессенджера (все сообщения импортируются как WhatsApp).

---

## Что уже работает

- Режим `sync_new_clients_only` в Edge Function
- Кнопка "Импорт новых" в интерфейсе SyncDashboard
- Счётчик клиентов без импортированных сообщений

---

## Что не работает на self-hosted

1. RPC функции `get_clients_without_imported_messages` и `count_clients_without_imported_messages` не созданы
2. Все импортируемые сообщения получают `messenger_type: 'whatsapp'` вместо реального типа мессенджера

---

## Шаги реализации

### Шаг 1: SQL миграция для self-hosted

Создать файл `docs/migrations/20250130_add_import_rpc_functions.sql`:

```text
┌──────────────────────────────────────────────────────────────┐
│  get_clients_without_imported_messages(p_org_id, offset, limit)  │
│  ─────────────────────────────────────────────────────────────  │
│  Возвращает клиентов с salebot_client_id,                       │
│  у которых нет сообщений с salebot_message_id                   │
├──────────────────────────────────────────────────────────────┤
│  count_clients_without_imported_messages(p_org_id)              │
│  ─────────────────────────────────────────────────────────────  │
│  Подсчёт таких клиентов для UI                                  │
└──────────────────────────────────────────────────────────────┘
```

### Шаг 2: Исправить определение мессенджера в импорте

Обновить `import-salebot-chats-auto/index.ts`:
- Использовать `salebot_client_type` клиента для определения `messenger_type`
- Добавить функцию маппинга (аналогично webhook)

```text
┌─────────────────┐      ┌─────────────────────────┐
│ salebot_client_type │ ──▶ │ messenger_type          │
├─────────────────┤      ├─────────────────────────┤
│ 1, 16, 21       │      │ telegram                │
│ 6               │      │ whatsapp                │
│ 20              │      │ max                     │
│ 0               │      │ vk                      │
│ 2               │      │ viber                   │
│ default         │      │ telegram                │
└─────────────────┘      └─────────────────────────┘
```

---

## Технические детали

### SQL функции для self-hosted:

```sql
-- Функция для получения клиентов без импортированных сообщений
CREATE OR REPLACE FUNCTION get_clients_without_imported_messages(
  p_org_id UUID,
  p_offset INT DEFAULT 0,
  p_limit INT DEFAULT 20
)
RETURNS TABLE(id UUID, name TEXT, salebot_client_id BIGINT) 
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.salebot_client_id
  FROM clients c
  WHERE c.organization_id = p_org_id
    AND c.salebot_client_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM chat_messages m 
      WHERE m.client_id = c.id 
        AND m.salebot_message_id IS NOT NULL
    )
  ORDER BY c.created_at
  OFFSET p_offset
  LIMIT p_limit;
$$;

-- Функция для подсчёта
CREATE OR REPLACE FUNCTION count_clients_without_imported_messages(p_org_id UUID)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM clients c
  WHERE c.organization_id = p_org_id
    AND c.salebot_client_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM chat_messages m 
      WHERE m.client_id = c.id 
        AND m.salebot_message_id IS NOT NULL
    );
$$;
```

### Изменения в Edge Function:

```typescript
// Добавить функцию маппинга (аналог из salebot-webhook)
function getMessengerTypeFromClientType(clientType: number | null): string {
  switch (clientType) {
    case 1: case 16: case 21: return 'telegram';
    case 6: return 'whatsapp';
    case 20: return 'max';
    case 0: return 'vk';
    case 2: return 'viber';
    default: return 'telegram';
  }
}

// В handleSyncNewClientsOnly - получать salebot_client_type
const { data: localClients } = await supabase
  .rpc('get_clients_without_imported_messages', {...})

// При создании сообщений использовать правильный тип
chatMessages.push({
  ...
  messenger_type: getMessengerTypeFromClientType(client.salebot_client_type),
  ...
});
```

---

## Результат

После применения:
1. Режим "Импорт новых" будет работать на self-hosted
2. Сообщения будут привязываться к правильному мессенджеру (Telegram, WhatsApp, и т.д.)
3. Переписка Зары из Telegram останется в Telegram, а не в WhatsApp

---

## Файлы для изменения

| Файл | Действие |
|------|----------|
| `docs/migrations/20250130_add_import_rpc_functions.sql` | Создать |
| `supabase/functions/import-salebot-chats-auto/index.ts` | Изменить |

