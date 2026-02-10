

# Исправление утечки realtime-подписок

Нужно внести 2 исправления, которые остановят лавинообразное создание WebSocket-соединений к базе данных.

## Что будет сделано

### 1. ParentChat.tsx -- захват cleanup-функции

Сейчас `subscribeToMessages()` возвращает функцию отписки, но она никуда не сохраняется. Канал `chat-{clientId}` создается и **никогда не удаляется**.

**Исправление:** вернуть cleanup из `useEffect`:

```text
useEffect(() => {
  if (client?.id) {
    loadMessages();
    const unsubscribe = subscribeToMessages();
    return unsubscribe;
  }
}, [client?.id]);
```

### 2. useChatMessagesOptimized.ts -- стабилизация зависимостей

Два хука (`useNewMessageRealtime` и `useMessageStatusRealtime`) включают callback-функции (`onNewMessage`, `onDeliveryFailed`) в массив зависимостей `useEffect`. При каждом ре-рендере ChatArea эти callbacks пересоздаются, что приводит к пересозданию подписки десятки раз в секунду.

**Исправление:** сохранять callbacks в `useRef`, убрать из зависимостей:

- `useNewMessageRealtime`: зависимости станут `[clientId, queryClient]`
- `useMessageStatusRealtime`: зависимости станут `[clientId, queryClient]`

## Технические детали

### Файл: `src/pages/portal/ParentChat.tsx` (строки 37-42)

Изменить useEffect чтобы cleanup вызывался при смене клиента или unmount.

### Файл: `src/hooks/useChatMessagesOptimized.ts`

**useNewMessageRealtime (строки 106-141):**
- Добавить `const onNewMessageRef = useRef(onNewMessage)` и синхронизирующий useEffect
- В callback использовать `onNewMessageRef.current?.()`
- Зависимости: `[clientId, queryClient]`

**useMessageStatusRealtime (строки 149-230):**
- Добавить `const onDeliveryFailedRef = useRef(onDeliveryFailed)` и синхронизирующий useEffect
- В callback использовать `onDeliveryFailedRef.current?.(newRecord.id!)`
- Зависимости: `[clientId, queryClient]`

## Ожидаемый результат

- Каналы создаются только при смене `clientId`, а не при каждом рендере
- Нагрузка на базу данных значительно снизится
- Реальное время продолжит работать корректно

