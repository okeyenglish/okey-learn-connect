
# План: Исправление загрузки чатов преподавателей на self-hosted

## Диагностика

Обнаружены **две ключевые проблемы**:

### Проблема 1: Несуществующие колонки в SELECT-запросе

**Файл:** `src/hooks/useTeacherChats.ts`, строка 131

**Текущий SELECT:**
```sql
id, client_id, message_text, message_type, ... direction, content, sender_id, sender_name, read_at, reply_to_id
```

**Проблема:** Колонки `direction`, `content`, `sender_id`, `sender_name`, `read_at`, `reply_to_id` **не существуют** в self-hosted схеме `chat_messages`.

**Следствие:** Запрос возвращает ошибку, что приводит к показу "Нет сообщений" для всех клиентов.

### Проблема 2: Невалидный UUID в chat_presence

**Файл:** `src/hooks/useChatPresence.ts`

**Ошибка в логах:**
```
invalid input syntax for type uuid: "teachers"
```

**Причина:** Когда пользователь переходит в раздел "Чат педагогов", `activeChatId` устанавливается в специальные значения (например, `"teachers"`), которые передаются в `useChatPresenceTracker`. Этот хук пытается сохранить `client_id = "teachers"` в таблицу `chat_presence`, но колонка `client_id` имеет тип `uuid`.

## Решение

### 1. Убрать несуществующие колонки из SELECT

**Файл:** `src/hooks/useTeacherChats.ts`

```typescript
// БЫЛО (строка 131):
.select(
  'id, client_id, message_text, ... direction, content, sender_id, sender_name, read_at, reply_to_id'
)

// СТАНЕТ:
.select(
  'id, client_id, message_text, message_type, system_type, is_read, is_outgoing, created_at, file_url, file_name, file_type, external_message_id, external_id, messenger_type, messenger, call_duration, message_status, status, metadata'
)
```

### 2. Валидация UUID перед записью в chat_presence

**Файл:** `src/hooks/useChatPresence.ts`

Добавить проверку на валидный UUID перед вызовом `upsert`:

```typescript
// Добавить функцию валидации UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// В useChatPresenceTracker:
export const useChatPresenceTracker = (clientId: string | null) => {
  // ...
  
  // Track presence for current chat - только для валидных UUID
  useEffect(() => {
    // Skip non-UUID clientIds (e.g., "teachers", "communities")
    if (!clientId || !isValidUUID(clientId)) {
      if (lastClientIdRef.current && isValidUUID(lastClientIdRef.current)) {
        clearPresence(lastClientIdRef.current);
      }
      lastClientIdRef.current = null;
      return;
    }
    // ... existing logic
  }, [clientId, ...]);
};
```

### 3. Аналогичная валидация в updatePresence

```typescript
const updatePresence = useCallback(async (targetClientId: string, type: PresenceType = 'viewing') => {
  const userId = currentUserIdRef.current;
  // Skip non-UUID clientIds
  if (!userId || !targetClientId || !isValidUUID(targetClientId)) return;
  // ... existing logic
}, []);
```

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `src/hooks/useTeacherChats.ts` | Убрать несуществующие колонки из SELECT (строка 131) |
| `src/hooks/useChatPresence.ts` | Добавить валидацию UUID для `clientId` |

## Техническая причина ошибки

Последний diff добавил колонки, которых нет в self-hosted схеме:

```diff
- 'id, client_id, message_text, ... external_id, messenger_type, messenger, call_duration, message_status, status, metadata'
+ 'id, client_id, message_text, ... metadata, direction, content, sender_id, sender_name, read_at, reply_to_id'
```

Эти колонки (`direction`, `content`, `sender_id`, `sender_name`, `read_at`, `reply_to_id`) существуют только в Lovable Cloud схеме, но не в self-hosted.

## Self-hosted схема chat_messages

Колонки, которые **точно существуют**:
- `id`, `client_id`, `phone_number_id`
- `message_text` (НЕ `content`)
- `message_type`, `system_type`
- `is_read`, `is_outgoing`
- `call_duration`, `created_at`
- `file_url`, `file_name`, `file_type`
- `external_message_id`, `external_id`
- `messenger_type`, `messenger`
- `message_status`, `status`
- `metadata`, `organization_id`
- `teacher_id`, `integration_id`

Колонок **НЕТ**:
- `content` (используется `message_text`)
- `direction` (используется `is_outgoing`)
- `sender_id`, `sender_name`
- `read_at`, `reply_to_id`
- `media_url`, `media_type`

## Ожидаемый результат

После исправлений:
1. Чаты преподавателей загрузятся без ошибок
2. Ошибка `invalid input syntax for type uuid: "teachers"` исчезнет
3. Presence-трекинг будет работать только для валидных UUID (клиентских чатов)
