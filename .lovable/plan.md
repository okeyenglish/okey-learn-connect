
# План исправления: Восстановление загрузки чатов преподавателей

## Проблема
После оптимизаций перестали загружаться:
1. Превью сообщений в списке преподавателей ("Нет сообщений" у всех)
2. Сами диалоги при открытии (60+ секунд таймаут)

## Причины найденных проблем

### 1. Отсутствие LIMIT в useTeacherChats.ts (строка 280-284)
```typescript
// ПРОБЛЕМА: Запрос БЕЗ лимита загружает ВСЕ сообщения всех преподавателей!
const { data: directMessages } = await supabase
  .from('chat_messages')
  .select('teacher_id, message_text, ...')
  .in('teacher_id', teacherIds)
  .order('created_at', { ascending: false });
// ← НЕТ .limit() !!!
```

Это вызывает таймаут при большом количестве сообщений.

### 2. Отсутствие индекса на self-hosted (критично!)
Запросы `WHERE teacher_id IN (...)` без индекса вынуждены сканировать всю таблицу `chat_messages`. При 50,000+ сообщениях это занимает 30-60 секунд.

### 3. Ошибка в range() в useTeacherChatMessagesV2.ts
```typescript
// БЫЛО:
.range(pageParam, pageParam + PAGE_SIZE); // Неправильно! range(0, 50) = 51 строка

// НУЖНО:
.range(pageParam, pageParam + PAGE_SIZE - 1); // range(0, 49) = 50 строк
```

## План исправлений

### Шаг 1: Добавить LIMIT в useTeacherChats.ts
```typescript
// Добавить лимит для запроса по teacher_id
const { data: directMessages, error: directError } = await supabase
  .from('chat_messages')
  .select('teacher_id, message_text, created_at, messenger_type, messenger, is_read, is_outgoing')
  .in('teacher_id', teacherIds)
  .order('created_at', { ascending: false })
  .limit(teacherIds.length * 20); // ~20 сообщений на преподавателя для превью
```

### Шаг 2: Исправить range() в useTeacherChatMessagesV2.ts
```typescript
// Исправить границы range для правильной пагинации
.range(pageParam, pageParam + PAGE_SIZE - 1);
```

### Шаг 3: Улучшить useTeacherConversations.ts
- Уменьшить лимит с `50 * batchSize` до `20 * batchSize`
- Добавить timeout обработку

## Обязательное действие на self-hosted сервере

После применения фронтенд-изменений, необходимо создать индекс на сервере:

```sql
-- Выполнить в SQL Editor на api.academyos.ru
CREATE INDEX IF NOT EXISTS idx_chat_messages_teacher_id_created
ON chat_messages (teacher_id, created_at DESC)
WHERE teacher_id IS NOT NULL;

ANALYZE chat_messages;
```

## Технические детали

**Файлы для изменения:**
- `src/hooks/useTeacherChats.ts` — добавить .limit()
- `src/hooks/useTeacherChatMessagesV2.ts` — исправить range()
- `src/hooks/useTeacherConversations.ts` — оптимизировать лимиты

**Результат:**
- Превью сообщений загрузятся быстро (~1-2 сек)
- Диалоги будут открываться без таймаутов
- После создания индекса — загрузка станет мгновенной
