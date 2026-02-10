

# Оптимизация: замена postgres_changes на Broadcast/Polling

## Контекст
Таблицы `typing_status` и `chat_presence` удалены из `supabase_realtime` публикации на self-hosted сервере. Сейчас код подписывается на `postgres_changes` для этих таблиц, но события больше не приходят. Нужно заменить механизм доставки.

## Что будет изменено

### 1. `useTypingStatus.ts` -- Broadcast API вместо postgres_changes
**Текущее**: подписка на `postgres_changes` таблицы `typing_status` + fallback polling каждые 10 сек.
**Новое**: 
- Убрать postgres_changes подписку
- Использовать Supabase Broadcast channel для мгновенной доставки typing-событий между менеджерами
- При вызове `updateTypingStatus()` -- по-прежнему писать в БД (для персистентности), но параллельно отправлять broadcast-событие в канал `typing-broadcast-{clientId}`
- Слушатели получают обновления через broadcast мгновенно
- Fallback polling каждые 10 сек сохраняется как страховка

### 2. `useTypingPresence.ts` -- только polling (без realtime)
**Текущее**: подписка на `postgres_changes` таблицы `typing_status` + fallback polling каждые 15 сек.
**Новое**:
- Убрать postgres_changes подписку полностью
- Увеличить частоту polling с 15 до 10 секунд (компенсация отсутствия realtime)
- Это список-уровень (chat list sidebar), задержка 10 сек допустима
- Меньше кода, проще логика

### 3. `useChatPresence.ts` (`useChatPresenceList`) -- только polling
**Текущее**: подписка на `postgres_changes` таблицы `chat_presence` + polling каждые 60 сек.
**Новое**:
- Убрать postgres_changes подписку
- Polling каждые 30 секунд (компенсация)
- Presence -- не критично для мгновенности, 30 сек достаточно

### 4. `useNewMessageHighlight.ts` -- исправление импорта
Использует `supabase` из `@/integrations/supabase/client` вместо `typedClient`. Это не ошибка сборки, но стоит унифицировать.

## Что НЕ меняется
- `useChatPresenceTracker` (запись в `chat_presence`) -- без изменений, продолжает upsert/delete в БД
- `useStaffTypingIndicator` -- уже использует Presence API, не трогаем
- `staff_work_sessions` -- уже на polling (60 сек), без realtime подписки
- `staff_tasks`, `staff_group_chats` -- уже на polling/invalidation, нет realtime подписок

## Технические детали

### Broadcast API для typing (useTypingStatus)
```text
Отправка:  supabase.channel('typing-bc-{clientId}').send({ type: 'broadcast', event: 'typing', payload: {...} })
Прием:     channel.on('broadcast', { event: 'typing' }, handler)
```
Broadcast не проходит через PostgreSQL WAL, идет напрямую через WebSocket -- нулевая нагрузка на БД.

### Файлы для изменения
- `src/hooks/useTypingStatus.ts` -- broadcast + polling
- `src/hooks/useTypingPresence.ts` -- polling only
- `src/hooks/useChatPresence.ts` -- polling only для useChatPresenceList

### Ожидаемый результат
- 3 канала `postgres_changes` убраны (typing_status x2 + chat_presence x1)
- CPU нагрузка на self-hosted снижена (нет WAL-декодирования для этих таблиц)
- Typing в открытом чате остается мгновенным (через Broadcast)
- Typing в списке чатов и presence обновляются с задержкой до 10-30 сек (допустимо)

