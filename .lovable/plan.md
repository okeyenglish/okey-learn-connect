
# План: Оптимизация загрузки реакций - устранение N+1 проблемы

## Выявленная проблема

При открытии чата каждое сообщение рендерит компонент `MessageReactions`, который вызывает:
- `useGroupedReactions(messageId)` → `useMessageReactions(messageId)`
- Это создаёт **отдельный HTTP-запрос для каждого сообщения**

При 50 сообщениях в чате = 50+ запросов к `message_reactions` таблице

## Решение: Batch-загрузка реакций

### Задача 1: Создать хук `useBatchMessageReactions`

Новый хук для загрузки реакций всех сообщений одним запросом:

```typescript
// src/hooks/useBatchMessageReactions.ts
export const useBatchMessageReactions = (messageIds: string[]) => {
  return useQuery({
    queryKey: ['batch_message_reactions', messageIds.join(',')],
    queryFn: async () => {
      if (messageIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('message_reactions')
        .select('id, message_id, user_id, emoji, created_at')
        .in('message_id', messageIds)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Группируем по message_id
      const byMessage: Record<string, Reaction[]> = {};
      for (const r of data || []) {
        if (!byMessage[r.message_id]) byMessage[r.message_id] = [];
        byMessage[r.message_id].push(r);
      }
      return byMessage;
    },
    enabled: messageIds.length > 0,
    staleTime: 30000,
  });
};
```

### Задача 2: Создать React Context для реакций

Контекст для передачи загруженных реакций вниз по дереву компонентов:

```typescript
// src/contexts/ReactionsContext.tsx
export const ReactionsContext = createContext<{
  reactions: Record<string, GroupedReaction[]>;
  isLoading: boolean;
}>({ reactions: {}, isLoading: false });

export const ReactionsProvider = ({ messageIds, children }) => {
  const { data, isLoading } = useBatchMessageReactions(messageIds);
  
  const groupedReactions = useMemo(() => {
    // Группируем реакции по emoji для каждого сообщения
    return processReactions(data);
  }, [data]);

  return (
    <ReactionsContext.Provider value={{ reactions: groupedReactions, isLoading }}>
      {children}
    </ReactionsContext.Provider>
  );
};
```

### Задача 3: Обновить MessageReactions компонент

Использовать контекст вместо индивидуального запроса:

```typescript
// src/components/crm/MessageReactions.tsx
export const MessageReactions = ({ messageId, ... }) => {
  // Вместо:
  // const { data: groupedReactions } = useGroupedReactions(messageId);
  
  // Используем:
  const { reactions } = useContext(ReactionsContext);
  const groupedReactions = reactions[messageId] || [];
  
  // ... остальная логика
};
```

### Задача 4: Обернуть ChatArea в ReactionsProvider

```typescript
// В ChatArea.tsx или MessagesContainer
const messageIds = useMemo(
  () => messages.map(m => m.id).filter(Boolean),
  [messages]
);

return (
  <ReactionsProvider messageIds={messageIds}>
    {messages.map(msg => <ChatMessage ... />)}
  </ReactionsProvider>
);
```

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `src/hooks/useBatchMessageReactions.ts` | Новый файл - batch-загрузка реакций |
| `src/contexts/ReactionsContext.tsx` | Новый файл - контекст для реакций |
| `src/components/crm/MessageReactions.tsx` | Использовать контекст вместо индивидуального запроса |
| `src/components/crm/ChatArea.tsx` | Обернуть сообщения в ReactionsProvider |

## Ожидаемый результат

| Метрика | До | После |
|---------|-----|-------|
| Запросов на реакции | 50+ (по числу сообщений) | 1 |
| Время загрузки чата | 2-5 сек | < 500 мс |
| Нагрузка на сеть | Высокая | Минимальная |

## Альтернативный вариант (быстрее в реализации)

Если контекст слишком сложен, можно просто отключить автоматическую загрузку реакций и грузить их только при наведении на сообщение:

```typescript
// В MessageReactions.tsx
const [shouldLoad, setShouldLoad] = useState(false);
const { data } = useGroupedReactions(messageId, { enabled: shouldLoad });

// При наведении на сообщение
onMouseEnter={() => setShouldLoad(true)}
```

Это уменьшит запросы с 50 до 0 при первой загрузке.
