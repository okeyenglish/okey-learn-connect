
# План: Ускорение загрузки списка чатов преподавателей

## Диагностика

Найдены **три критические проблемы**, которые блокируют быструю загрузку:

### 1. Ошибка `whatsapp_id does not exist` в bulk-fetch-avatars

**Консоль:**
```
[BulkAvatar] Error: Failed to fetch clients: column clients.whatsapp_id does not exist
```

**Причина:** Edge функция `bulk-fetch-avatars` пытается получить колонку `whatsapp_id` из таблицы `clients`, но в self-hosted схеме этой колонки НЕТ.

**Файл:** `supabase/functions/bulk-fetch-avatars/index.ts`, строка 91

```typescript
// Текущий код:
.select('id, whatsapp_id, phone, telegram_user_id')
```

Эта ошибка **не блокирует** загрузку списка, но создаёт лишний шум в логах.

### 2. Последовательные запросы в useTeacherChats (главный bottleneck)

**Файл:** `src/hooks/useTeacherChats.ts`, строки 379-445

В fallback-логике для каждого преподавателя выполняются **2 последовательных запроса**:
1. `chat_messages.select(...).eq('client_id', ...)` — получить последнее сообщение
2. `chat_messages.select(..., { count: 'exact' })` — посчитать непрочитанные

Если преподавателей 50, это **100+ последовательных запросов**, что занимает минуты!

**Строка 433-437:**
```typescript
const { count: unreadCount } = await supabase
  .from('chat_messages')
  .select('id', { count: 'exact', head: true })
  .eq('client_id', matchedClient.id)
  .eq('is_outgoing', false)
  // ОТСУТСТВУЕТ .eq('is_read', false) — считает ВСЕ входящие, не только непрочитанные!
```

**Дополнительный баг:** Пропущен фильтр `is_read = false`, поэтому `unreadCount` всегда равен общему числу входящих сообщений.

### 3. Неоптимальный batch-запрос в useTeacherConversations

**Файл:** `src/hooks/useTeacherConversations.ts`, строки 65-82

Запрос получает ~20 сообщений на преподавателя (`limit(batchIds.length * 20)`), но если преподавателей 100, это попытка загрузить **2000 строк за раз**. При отсутствии индекса это очень медленно.

## Решение

### Шаг 1: Исправить bulk-fetch-avatars (убрать несуществующую колонку)

**Файл:** `supabase/functions/bulk-fetch-avatars/index.ts`

```typescript
// БЫЛО (строка 91):
.select('id, whatsapp_id, phone, telegram_user_id')

// СТАНЕТ (self-hosted не имеет whatsapp_id, whatsapp_chat_id в clients):
.select('id, phone, telegram_user_id')
```

Также исправить интерфейс `ClientRecord`:
```typescript
interface ClientRecord {
  id: string;
  phone?: string | null;
  telegram_user_id?: string | null;
}
```

И функцию `fetchWhatsAppAvatar`:
```typescript
// Использовать phone вместо whatsapp_id
let chatId: string | null = null;
if (client.phone) {
  const normalizedPhone = client.phone.replace(/\D/g, '');
  chatId = normalizedPhone.includes('@') ? normalizedPhone : `${normalizedPhone}@c.us`;
}
```

### Шаг 2: Оптимизировать useTeacherChats — batch-запрос вместо N запросов

**Файл:** `src/hooks/useTeacherChats.ts`

Заменить последовательные запросы на **один batch-запрос**:

```typescript
// Вместо цикла с await внутри:
// БЫЛО (строки 379-447):
for (const teacher of teachersList) {
  // ...
  const { data: lastMsg } = await supabase...  // запрос 1
  const { count } = await supabase...           // запрос 2
}

// СТАНЕТ — один запрос на все сообщения:
const clientIds = teacherClients.map(c => c.id);
const { data: allMessages } = await supabase
  .from('chat_messages')
  .select('client_id, message_text, created_at, messenger_type, is_read, is_outgoing')
  .in('client_id', clientIds)
  .order('created_at', { ascending: false })
  .limit(clientIds.length * 10);

// Группируем в Map и вычисляем stats локально
const messagesByClient = new Map<string, any[]>();
(allMessages || []).forEach(msg => {
  // ...group by client_id
});

// Затем обходим teachersList и берём данные из Map
```

### Шаг 3: Исправить баг с подсчётом непрочитанных

**Файл:** `src/hooks/useTeacherChats.ts`, строка 437

```typescript
// БЫЛО (без фильтра is_read):
.eq('is_outgoing', false)

// СТАНЕТ:
.eq('is_outgoing', false)
.eq('is_read', false)  // Добавить!
```

### Шаг 4: Оптимизировать useTeacherConversations — уменьшить объём запроса

**Файл:** `src/hooks/useTeacherConversations.ts`, строки 62-75

```typescript
// БЫЛО:
const batchSize = 100;
// ...
.limit(batchIds.length * 20); // До 2000 строк!

// СТАНЕТ:
const batchSize = 30;  // Меньше преподавателей за раз
// ...
.limit(batchIds.length * 5); // Только 5 сообщений на превью
```

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `supabase/functions/bulk-fetch-avatars/index.ts` | Убрать `whatsapp_id` из select, использовать phone |
| `src/hooks/useTeacherChats.ts` | Заменить N+1 запросы на batch-запрос, добавить `is_read = false` |
| `src/hooks/useTeacherConversations.ts` | Уменьшить batchSize и limit |

## Ожидаемый результат

- Ошибка `whatsapp_id does not exist` исчезнет
- Загрузка списка преподавателей сократится с минут до секунд (1-2 запроса вместо 100+)
- Подсчёт непрочитанных будет корректным (только `is_read = false`)
- Превью сообщений появятся быстро

## Рекомендуемые индексы (выполнить на self-hosted)

```sql
-- Для быстрого поиска сообщений по teacher_id
CREATE INDEX IF NOT EXISTS idx_chat_messages_teacher_id_created
ON chat_messages (teacher_id, created_at DESC)
WHERE teacher_id IS NOT NULL;

-- Для быстрого поиска сообщений по client_id
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_id_created
ON chat_messages (client_id, created_at DESC);

-- Для быстрого подсчёта непрочитанных
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_unread
ON chat_messages (client_id, is_read)
WHERE is_read = false AND is_outgoing = false;

ANALYZE chat_messages;
```
