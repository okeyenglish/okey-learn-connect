
# План оптимизации производительности AcademyOS

## Текущее состояние

После выполненного рефакторинга auth-запросов (50 → 1-2) система уже получила значительное улучшение. Анализ кодовой базы показал следующие области для дальнейшей оптимизации:

---

## 1. Оптимизация Bundle Size (Code Splitting)

### Проблема
Файл `CRM.tsx` содержит **4652 строки** — это монолитный компонент с множеством импортов, загружающийся целиком при старте.

### Решение
- Разбить `CRM.tsx` на отдельные модули по функциональным зонам
- Вынести тяжелые компоненты (модальные окна, формы) в lazy-load
- Использовать динамические импорты для редко используемых функций

### Технические детали
```typescript
// Текущее (загружается сразу):
import { ScheduleModal } from "@/components/schedule/ScheduleModal";

// Оптимизировано (загружается по требованию):
const ScheduleModal = lazy(() => 
  import("@/components/schedule/ScheduleModal")
);
```

### Ожидаемый результат
- Уменьшение initial bundle на 30-40%
- Ускорение First Contentful Paint на 1-2 секунды

---

## 2. Консолидация Realtime-подписок

### Текущее состояние
Найдено **46 файлов** с `.subscribe()` вызовами — это создает множество WebSocket соединений.

### Уже реализовано
`useOrganizationRealtimeMessages` — единая подписка на уровне CRM для chat_messages.

### Дополнительная оптимизация
- Консолидировать подписки для:
  - `lesson_sessions` (3 отдельные подписки)
  - `tasks` (3 подписки)
  - `chat_states` (2 подписки)
- Создать единый `RealtimeHub` для управления всеми подписками

### Технические детали
```typescript
// Централизованный хаб подписок
const useRealtimeHub = () => {
  // Одна подписка на несколько таблиц
  supabase.channel('app-realtime')
    .on('postgres_changes', { table: 'chat_messages' }, ...)
    .on('postgres_changes', { table: 'tasks' }, ...)
    .on('postgres_changes', { table: 'lesson_sessions' }, ...)
    .subscribe();
};
```

### Ожидаемый результат
- Сокращение WebSocket соединений с ~20 до 3-5
- Снижение нагрузки на сервер

---

## 3. Оптимизация React Query кеширования

### Проблема
Разные хуки используют разные настройки кеширования, некоторые слишком агрессивно инвалидируют кеш.

### Текущие проблемные места
```typescript
// Слишком частое обновление (каждые 10 сек)
staleTime: 10 * 1000  // chat-threads-unread-priority
refetchInterval: 60000  // assistant messages

// Отсутствие кеширования
staleTime: 0  // message-read-status
```

### Решение
- Увеличить `staleTime` для редко меняющихся данных
- Использовать `select` для извлечения только нужных полей
- Применить `placeholderData` для мгновенного отображения

### Изменения
| Хук | Было | Станет |
|-----|------|--------|
| chat-threads-unread | 10s | 30s |
| manager-branches | 5 min | 30 min |
| students | 5 min | 10 min |

---

## 4. Мемоизация тяжелых вычислений

### Проблема
Некоторые компоненты пересчитывают данные при каждом рендере.

### Найденные места для оптимизации
- `VirtualizedChatList` — уже использует `React.memo`, но можно улучшить
- `ChatMessage` — много `useMemo` внутри, но callbacks не мемоизированы
- `TeacherChatArea` — фильтрация по филиалам на каждый рендер

### Решение
```typescript
// Мемоизация фильтрованных списков
const filteredTeachers = useMemo(() => 
  teachers.filter(t => t.branch === selectedBranch),
  [teachers, selectedBranch]
);

// Мемоизация callbacks
const handleClick = useCallback((id) => {
  onSelect(id);
}, [onSelect]);
```

---

## 5. Отложенная загрузка данных

### Текущая проблема
При загрузке CRM сразу запрашиваются:
- Все клиенты
- Все студенты  
- Все задачи
- Все группы

### Решение
Уже частично реализовано через `useStudentsLazy`, но можно расширить:

```typescript
// Загружать данные только при открытии соответствующего раздела
const { students } = useStudentsLazy(activeTab === 'students');
const { tasks } = useTasksLazy(activeTab === 'tasks');
```

### Дополнительно
- Использовать intersection observer для lazy-load секций
- Prefetch данных при hover на вкладку

---

## 6. Оптимизация SQL-запросов

### Текущее состояние
Используются RPC-функции:
- `get_chat_threads_paginated` — пагинация тредов
- `get_chat_threads_fast` — быстрая загрузка
- `get_family_data_optimized` — данные семьи

### Дополнительные оптимизации для self-hosted
```sql
-- Добавить partial indexes для часто используемых фильтров
CREATE INDEX idx_chat_messages_recent 
ON chat_messages (created_at DESC) 
WHERE created_at > NOW() - INTERVAL '7 days';

-- Materialized view для списка чатов
CREATE MATERIALIZED VIEW chat_threads_mv AS
SELECT ... 
REFRESH CONCURRENTLY;
```

---

## 7. Оптимизация изображений и медиа

### Текущее состояние
Реализовано кеширование через `mediaCache.ts` с лимитами:
- Видео: 500 МБ
- Изображения: 200 МБ
- Аудио: 100 МБ

### Дополнительные улучшения
- Добавить lazy loading для аватаров в списке чатов
- Использовать blur placeholder при загрузке
- Конвертировать изображения в WebP на сервере

---

## 8. Service Worker оптимизация (PWA)

### Текущее состояние
Настроен `vite-plugin-pwa` и `workbox-precaching`.

### Улучшения
- Кешировать API-ответы для offline работы
- Добавить stale-while-revalidate для статических ресурсов
- Background sync для отложенных операций

---

## Приоритеты реализации

| Приоритет | Оптимизация | Сложность | Влияние |
|-----------|-------------|-----------|---------|
| 1 | Code splitting CRM.tsx | Средняя | Высокое |
| 2 | Консолидация realtime | Средняя | Среднее |
| 3 | Увеличение staleTime | Низкая | Среднее |
| 4 | Мемоизация компонентов | Низкая | Среднее |
| 5 | SQL индексы | Низкая | Высокое |
| 6 | PWA кеширование | Средняя | Среднее |

---

## Ожидаемые результаты после всех оптимизаций

| Метрика | Текущее | После оптимизации |
|---------|---------|-------------------|
| Initial Load | ~8 сек | ~3-4 сек |
| Auth requests | 1-2 | 1-2 (уже оптимизировано) |
| WebSocket connections | ~20 | 3-5 |
| Bundle size (initial) | ~1.5 MB | ~900 KB |
| Time to Interactive | ~5 сек | ~2-3 сек |
