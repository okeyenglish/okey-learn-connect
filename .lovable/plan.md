

# План: Исправление обновления счётчика clientsWithoutMessages в SyncDashboard

## Обнаруженная проблема

Счётчик "Новые клиенты для импорта" (11 206 / 11 208) не обновляется по двум причинам:

1. **Проблема closure**: Функция `refreshClientsWithoutMessagesCount` захватывает значение `organizationId` на момент создания `useEffect`. Когда `organizationId` меняется с `undefined` на реальное значение, функция в интервале продолжает использовать старое значение.

2. **Отсутствие перезапуска `fetchDbStats`**: При изменении `organizationId` вызывается только `startPolling()`, но `fetchDbStats()` не вызывается повторно с новым `organizationId`.

## Решение

### Шаг 1: Использовать `useCallback` для функций, зависящих от `organizationId`

Обернуть `fetchDbStats` и `refreshClientsWithoutMessagesCount` в `useCallback` с зависимостью от `organizationId`, чтобы они всегда использовали актуальное значение.

### Шаг 2: Добавить явный перезапуск при изменении `organizationId`

В `useEffect` добавить вызов `fetchDbStats()` при каждом изменении `organizationId` (не только при монтировании).

### Шаг 3: Использовать `useRef` для хранения актуального `organizationId`

Альтернативный подход — использовать `useRef`, чтобы интервальные функции всегда получали актуальное значение без пересоздания интервалов.

## Изменения в файлах

### `src/components/admin/SyncDashboard.tsx`

```typescript
// 1. Добавить useRef для organizationId (избегаем проблему closure)
const organizationIdRef = useRef(organizationId);
useEffect(() => {
  organizationIdRef.current = organizationId;
}, [organizationId]);

// 2. Обновить fetchDbStats использовать ref
const fetchDbStats = async () => {
  const currentOrgId = organizationIdRef.current;  // ← использовать ref
  try {
    const [/* ... */] = await Promise.all([
      // ... другие запросы
      currentOrgId 
        ? supabase.rpc('count_clients_without_imported_messages', { p_org_id: currentOrgId })
        : Promise.resolve({ data: 0, error: null })
    ]);
    // ...
  } catch (error) {
    console.error('Error fetching DB stats:', error);
  }
};

// 3. Обновить refreshClientsWithoutMessagesCount
const refreshClientsWithoutMessagesCount = async () => {
  const currentOrgId = organizationIdRef.current;  // ← использовать ref
  if (!currentOrgId) return;
  try {
    const { data, error } = await supabase.rpc('count_clients_without_imported_messages', { 
      p_org_id: currentOrgId 
    });
    if (!error && data !== null) {
      setClientsWithoutMessages(data as number);
    }
  } catch (error) {
    console.error('Error refreshing clients without messages count:', error);
  }
};

// 4. Добавить отдельный useEffect для перезагрузки при получении organizationId
useEffect(() => {
  if (organizationId) {
    // Когда organizationId становится доступным, перезагружаем статистику
    fetchDbStats();
  }
}, [organizationId]);
```

## Технические детали

### Почему `useRef`?

Интервальные функции создаются один раз и сохраняют ссылку на значения через closure. Когда `organizationId` меняется, функция в интервале не "видит" новое значение. `useRef` решает эту проблему, поскольку ref.current всегда указывает на актуальное значение.

### Альтернатива: `useCallback` + пересоздание интервалов

Можно использовать `useCallback` с зависимостью `[organizationId]`, но это приведёт к пересозданию интервалов каждый раз при изменении зависимости — менее эффективно.

## Результат

После исправления:
1. При первой загрузке страницы, если `organizationId` ещё не загружен — функция корректно подождёт
2. Когда `organizationId` становится доступным — `fetchDbStats()` вызовется автоматически
3. Интервал `refreshClientsWithoutMessagesCount` будет использовать актуальный `organizationId`
4. Счётчик будет обновляться каждые 30 секунд корректно

