
# План оптимизации загрузки диалогов преподавателей

## Диагноз проблемы

При открытии чата преподавателя происходит медленная загрузка сообщений, хотя превью в списке грузятся быстро. Причины:

1. **Разные запросы для превью и диалога:**
   - Превью (список): `useTeacherChats` → batch-запрос `chat_messages` с `LIMIT teacherIds.length * 20` (5 сообщений на преподавателя)
   - Диалог: `useTeacherChatMessagesV2` → полный запрос `SELECT *` с `LIMIT 50` по одному `teacher_id`

2. **Запрос `SELECT *` избыточен:**
   - Хук `useTeacherChatMessagesV2` запрашивает ВСЕ колонки (`select('*')`)
   - Индекс `idx_chat_messages_teacher_id_created` покрывает только `(teacher_id, created_at)`
   - Для полного `SELECT *` БД делает дополнительное чтение данных с диска (heap fetch)

3. **Отсутствие in-memory кеша:**
   - В отличие от `useChatMessagesOptimized` (для клиентов), хук для преподавателей не использует in-memory cache
   - При каждом переключении на чат идёт полный запрос к БД

## Решение

### Шаг 1: Оптимизировать запрос в useTeacherChatMessagesV2

**Файл:** `src/hooks/useTeacherChatMessagesV2.ts`

Заменить `select('*')` на выборку только нужных полей:

```typescript
// БЫЛО:
.select('*')

// СТАНЕТ:
.select(`
  id, teacher_id, message_text, message_type, system_type, is_read, is_outgoing,
  created_at, file_url, file_name, file_type, external_message_id,
  messenger_type, call_duration, message_status, metadata
`)
```

### Шаг 2: Добавить in-memory cache

По аналогии с `useChatMessagesOptimized`, добавить быстрый кеш для мгновенного отображения:

```typescript
// In-memory cache for instant display
const teacherMessageCache = new Map<string, { messages: ChatMessage[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

### Шаг 3: Использовать placeholderData

Использовать кешированные данные для мгновенного отображения, пока загружаются свежие:

```typescript
placeholderData: cachedData || undefined,
```

### Шаг 4: Создать индекс на self-hosted (если не существует)

**Выполнить на api.academyos.ru:**

```sql
CREATE INDEX IF NOT EXISTS idx_chat_messages_teacher_id_created
ON chat_messages (teacher_id, created_at DESC)
WHERE teacher_id IS NOT NULL;

ANALYZE chat_messages;
```

## Ожидаемые результаты

| Метрика | До оптимизации | После оптимизации |
|---------|----------------|-------------------|
| Первая загрузка диалога | 2-5 сек | 100-300 мс |
| Повторное открытие | 2-5 сек | Мгновенно (кеш) |
| Переключение между чатами | Задержка + skeleton | Мгновенно |

## Технические детали

### Изменяемые файлы

1. `src/hooks/useTeacherChatMessagesV2.ts` — основной хук загрузки сообщений

### Дополнительные рекомендации

1. Проверить наличие индекса `idx_chat_messages_teacher_id_created` на self-hosted БД
2. Выполнить `ANALYZE chat_messages` после создания индекса для обновления статистики планировщика
3. При необходимости увеличить `shared_buffers` в PostgreSQL для кеширования частых запросов
