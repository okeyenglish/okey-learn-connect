

## Ускорение загрузки чатов с клиентами

### Текущая ситуация

Из логов и сетевых запросов видно:
- `get_unread_chat_threads` -- **729мс**, возвращает 0 полезных тредов (все непрочитанные -- это групповые чаты типа "ЖК Волгоградский" с 598 непрочитанными, которые потом отфильтровываются на клиенте)
- `get_chat_threads_paginated` -- **880-1100мс** за первую страницу (50 тредов)
- `hydrateClientBranches` -- дополнительный запрос к `clients` для подстановки филиалов, если RPC их не вернул
- Итого: **~1.5-2 секунды** до появления списка чатов

### Узкие места

1. **Бесполезный запрос непрочитанных**: RPC `get_unread_chat_threads` возвращает групповые чаты (ЖК, Support с telegram_chat_id начинающимся на -100), которые потом фильтруются на клиенте. 700мс потрачены впустую.

2. **Два параллельных RPC вместо одного**: `useChatThreadsInfinite` делает 2 запроса одновременно (unread + paginated), хотя `get_chat_threads_paginated` уже сортирует непрочитанные наверх.

3. **hydrateClientBranches**: Дополнительный SELECT к `clients` для подстановки филиалов, хотя RPC `get_chat_threads_paginated` уже возвращает `client_branch`.

### План оптимизации

**Файл: `src/hooks/useChatThreadsInfinite.ts`**

1. **Убрать отдельный запрос `get_unread_chat_threads`**: Он дублирует данные из `get_chat_threads_paginated` и тратит 700мс впустую. RPC `get_chat_threads_paginated` уже сортирует непрочитанные наверх -- отдельный запрос не нужен.

2. **Убрать `hydrateClientBranches`**: Проверка сетевого ответа показывает, что `get_chat_threads_paginated` уже возвращает `client_branch` (например "Котельники", "Окская"). Дополнительный SELECT не нужен.

3. **Убрать дублирующую логику мержа и сортировки**: Без отдельного unread-запроса не нужен сложный `useMemo` с дедупликацией и сортировкой двух массивов.

### Технические детали

Изменения затрагивают только `src/hooks/useChatThreadsInfinite.ts`:

```text
Было:
  useInfiniteQuery(['chat-threads-infinite'])  ~880мс
  + useQuery(['chat-threads-unread-priority'])  ~730мс  (впустую)
  + hydrateClientBranches()                     ~50-100мс (не нужна)
  + useMemo merge + sort + dedup               ~5мс
  = ~1.7 секунды

Будет:
  useInfiniteQuery(['chat-threads-infinite'])  ~880мс
  = ~0.9 секунды (ускорение ~2x)
```

Конкретные изменения:
- Удалить `unreadQuery` (useQuery с ключом `chat-threads-unread-priority`) -- строки ~315-356
- Удалить вызов `hydrateClientBranches` после `mapRpcToThreads` -- строка 286
- Убрать импорт `hydrateClientBranches`
- Упростить `allThreads` useMemo: просто брать данные из infiniteQuery без мержа с unread
- Упростить `isLoading`: убрать зависимость от `unreadQuery`
- Упростить `refetch`: убрать рефетч `unreadQuery`
- Удалить флаг `useUnreadRpc` и связанную логику

Fallback `fetchThreadsDirectly` остается без изменений для случаев, когда RPC недоступна.

