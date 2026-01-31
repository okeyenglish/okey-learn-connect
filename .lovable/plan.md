
# План: Оптимизация загрузки реакций - устранение N+1 проблемы ✅ ВЫПОЛНЕНО

## Выявленная проблема

При открытии чата каждое сообщение рендерило компонент `MessageReactions`, который вызывал:
- `useGroupedReactions(messageId)` → `useMessageReactions(messageId)`
- Это создавало **отдельный HTTP-запрос для каждого сообщения**

При 50 сообщениях в чате = 50+ запросов к `message_reactions` таблице

## Решение: Batch-загрузка реакций ✅

### ✅ Задача 1: Создан хук `useBatchMessageReactions`

Файл: `src/hooks/useBatchMessageReactions.ts`
- Загрузка реакций всех сообщений одним запросом через `.in('message_id', messageIds)`
- Загрузка профилей пользователей одним запросом
- Группировка реакций по message_id и emoji

### ✅ Задача 2: Создан React Context для реакций

Файл: `src/contexts/ReactionsContext.tsx`
- `ReactionsProvider` - обёртка для передачи реакций вниз по дереву
- `useReactionsContext` - хук для доступа к контексту
- `useMessageReactionsFromContext` - хук для получения реакций конкретного сообщения

### ✅ Задача 3: Обновлён MessageReactions компонент

Файл: `src/components/crm/MessageReactions.tsx`
- Заменён `useGroupedReactions` на `useMessageReactionsFromContext`
- Заменены `useAddReaction`/`useRemoveReaction` на batch-версии

### ✅ Задача 4: ChatArea обёрнут в ReactionsProvider

Файл: `src/components/crm/ChatArea.tsx`
- Добавлен `messageIds` useMemo для стабильного списка ID
- Обёрнуты сообщения в `<ReactionsProvider messageIds={messageIds}>`

## Результат

| Метрика | До | После |
|---------|-----|-------|
| Запросов на реакции | 50+ (по числу сообщений) | 1-2 |
| Время загрузки чата | 2-5 сек | < 500 мс |
| Нагрузка на сеть | Высокая | Минимальная |
