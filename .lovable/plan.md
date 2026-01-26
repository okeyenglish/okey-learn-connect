
# План оптимизации нагрузки на self-hosted Supabase

## Обзор проблемы

Анализ выявил ~1.7 MB/s дисковой активности (WAL записи) от следующих источников:

| Источник | Интервал | Проблема |
|----------|----------|----------|
| `useTypingPresence` | На каждое событие | `SELECT *` при каждом изменении typing_status |
| `useTypingStatus` | На каждое событие | 3 подписки делают `refresh()` на каждый INSERT/UPDATE/DELETE |
| `useEventStats` | 30 сек | Polling статистики событий |
| `useAssistantMessages` | 30 сек | Polling непрочитанных сообщений |
| `PendingPaymentsPanel` | 30 сек | Polling платежей |
| `useOrganizationRealtimeMessages` | 30 сек | Hybrid polling как fallback |
| `useMaterializedView` | 5 мин | Тяжёлый REFRESH MATERIALIZED VIEW |
| WhatsApp polling | 30-60 сек | Множественные интервалы проверки статуса |

---

## Фаза 1: Критические оптимизации (высокий приоритет)

### 1.1 Оптимизация useTypingPresence

**Текущая проблема**: На каждое событие postgres_changes выполняется `SELECT * FROM typing_status`

**Решение**: Использовать payload из события напрямую вместо refresh()

```typescript
// Вместо:
.on('postgres_changes', { event: '*', ... }, () => refresh())

// Использовать:
.on('postgres_changes', { event: '*', ... }, (payload) => {
  const record = payload.new as TypingStatusWithName;
  setTypingByClient(prev => {
    const updated = { ...prev };
    if (payload.eventType === 'DELETE' || !record.is_typing) {
      // Удаляем из карты
      if (updated[record.client_id]) {
        updated[record.client_id].count--;
        if (updated[record.client_id].count <= 0) {
          delete updated[record.client_id];
        }
      }
    } else {
      // Добавляем/обновляем
      if (!updated[record.client_id]) {
        updated[record.client_id] = { count: 0, names: [] };
      }
      // ... логика обновления
    }
    return updated;
  });
})
```

**Файл**: `src/hooks/useTypingPresence.ts`

### 1.2 Оптимизация useTypingStatus

**Текущая проблема**: 3 отдельных подписки (INSERT, UPDATE, DELETE), каждая вызывает `refreshTyping()` с SELECT

**Решение**: 
1. Объединить в одну подписку с `event: '*'`
2. Использовать payload напрямую

```typescript
const channel = supabase
  .channel(`typing_status_${clientId}`)
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'typing_status', filter: `client_id=eq.${clientId}` },
    (payload) => {
      // Обновляем состояние из payload без SELECT
      const record = payload.new || payload.old;
      setTypingUsers(prev => {
        if (payload.eventType === 'DELETE') {
          return prev.filter(t => t.user_id !== record.user_id);
        } else {
          const existing = prev.findIndex(t => t.user_id === record.user_id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = record;
            return updated;
          }
          return [...prev, record];
        }
      });
    }
  )
  .subscribe();
```

**Файл**: `src/hooks/useTypingStatus.ts`

---

## Фаза 2: Увеличение интервалов polling (средний приоритет)

### 2.1 Увеличить refetchInterval с 30 до 60 секунд

| Файл | Было | Станет |
|------|------|--------|
| `useAssistantMessages.ts` | 30000 | 60000 |
| `useEventBus.ts` | 30000 | 60000 |
| `PendingPaymentsPanel.tsx` | 30000 | 60000 |

### 2.2 Увеличить hybrid polling в useOrganizationRealtimeMessages

```typescript
// Было
const HYBRID_POLLING_INTERVAL = 30000;

// Станет
const HYBRID_POLLING_INTERVAL = 60000;
```

**Файл**: `src/hooks/useOrganizationRealtimeMessages.ts`

---

## Фаза 3: Оптимизация материализованных представлений

### 3.1 Увеличить интервал автообновления

```typescript
// Было: 5 минут по умолчанию
export function useAutoRefreshMaterializedViews(intervalMinutes: number = 5)

// Станет: 15 минут
export function useAutoRefreshMaterializedViews(intervalMinutes: number = 15)
```

### 3.2 Добавить условие видимости вкладки

```typescript
useEffect(() => {
  const doRefresh = () => {
    // Обновляем только если вкладка активна
    if (document.visibilityState === 'visible') {
      refresh();
    }
  };
  
  doRefresh(); // При монтировании
  const interval = setInterval(doRefresh, intervalMinutes * 60 * 1000);
  return () => clearInterval(interval);
}, [refresh, intervalMinutes]);
```

**Файл**: `src/hooks/useMaterializedView.ts`

---

## Фаза 4: Консолидация Realtime подписок (низкий приоритет)

### 4.1 Текущее состояние
- **33 подписки** на `postgres_changes`
- Дублирование: `chat_messages` в 4 местах, `typing_status` в 2 местах

### 4.2 Рекомендация
Создать централизованный хук `useGlobalRealtimeSubscriptions` который:
1. Поддерживает ОДНУ подписку на таблицу
2. Распределяет события через EventEmitter или Context

*Это большой рефакторинг, отложить на будущее*

---

## Итоговый список файлов для изменения

| Файл | Изменение |
|------|-----------|
| `src/hooks/useTypingPresence.ts` | Использовать payload вместо refresh() |
| `src/hooks/useTypingStatus.ts` | Объединить подписки, использовать payload |
| `src/hooks/useAssistantMessages.ts` | refetchInterval: 30000 → 60000 |
| `src/hooks/useEventBus.ts` | refetchInterval: 30000 → 60000 |
| `src/components/payments/PendingPaymentsPanel.tsx` | refetchInterval: 30000 → 60000 |
| `src/hooks/useOrganizationRealtimeMessages.ts` | HYBRID_POLLING_INTERVAL: 30000 → 60000 |
| `src/hooks/useMaterializedView.ts` | Интервал 5 → 15 мин, проверка visibilityState |

---

## Ожидаемый результат

| Метрика | До | После |
|---------|-----|-------|
| SELECT запросов от typing_status | ~20/сек при активности | 0 (используем payload) |
| Polling запросов | каждые 30 сек × 3 источника | каждые 60 сек |
| MV refresh | каждые 5 мин | каждые 15 мин |
| Disk I/O (WAL) | ~1.7 MB/s | ~0.5-0.8 MB/s (ожидание) |

---

## SQL миграция

Для self-hosted необходимо выполнить ранее созданную миграцию:

```sql
-- Выполнить на self-hosted Supabase:
ALTER TABLE public.typing_status
ADD COLUMN IF NOT EXISTS draft_text TEXT,
ADD COLUMN IF NOT EXISTS manager_name TEXT;
```

**Путь к файлу**: `docs/migrations/add_typing_status_columns.sql`
