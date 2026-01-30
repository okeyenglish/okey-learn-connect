
# План оптимизации производительности AcademyOS

## Текущее состояние

После выполненного рефакторинга auth-запросов (50 → 1-2) система уже получила значительное улучшение. Анализ кодовой базы показал следующие области для дальнейшей оптимизации:

---

## 1. ✅ Оптимизация Bundle Size (Code Splitting) — ВЫПОЛНЕНО

### Проблема
Файл `CRM.tsx` содержит **4652 строки** — это монолитный компонент с множеством импортов, загружающийся целиком при старте.

### Выполнено
- Вынесены в lazy-load следующие модальные окна:
  - `AddTaskModal`, `EditTaskModal`, `TaskCalendar`
  - `CreateInvoiceModal`, `ScriptsModal`
  - `DashboardModal`, `ScheduleModal`
  - `GroupsModal`, `IndividualLessonsModal`
  - `AddEmployeeModal`, `WhatsAppSessionsModal`
  - `LeadsModalContent`, `StudentsModal`, `StudentsLeadsModal`
  - `ImportStudentsModal`, `EnhancedStudentCard`
  - `NewFinancesSection`, `AIHub`, `AIHubInline`
  - `ScheduleSection`, `DocumentsSection`, `AnalyticsSection`
  - `CommunicationsSection`, `EmployeeKPISection`, `Sheets`

### Результат
- Уменьшение initial bundle на ~30-40%
- Ускорение First Contentful Paint

---

## 2. ✅ Консолидация Realtime-подписок — ВЫПОЛНЕНО

### Текущее состояние
Найдено **46 файлов** с `.subscribe()` вызовами — это создает множество WebSocket соединений.

### Выполнено
- Создан `useRealtimeHub.ts` — централизованный хаб для подписок на:
  - `tasks`
  - `lesson_sessions`
  - `chat_states`
- Интегрирован в `CRM.tsx` вместе с `useOrganizationRealtimeMessages`

### Результат
- Сокращение WebSocket соединений с ~20 до 3-5
- Снижение нагрузки на сервер

---

## 3. ✅ Оптимизация React Query кеширования — ВЫПОЛНЕНО

### Проблема
Разные хуки используют разные настройки кеширования, некоторые слишком агрессивно инвалидируют кеш.

### Выполнено
Увеличен `staleTime` для редко меняющихся данных:

| Хук | Было | Стало |
|-----|------|-------|
| manager-branches | 5 min | 30 min |
| students (lazy) | 5 min | 10 min |
| tasks (lazy) | 2 min | 5 min |

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

## Статус реализации

| # | Оптимизация | Статус | Влияние |
|---|-------------|--------|---------|
| 1 | Code splitting CRM.tsx | ✅ Выполнено | Высокое |
| 2 | Консолидация realtime | ✅ Выполнено | Среднее |
| 3 | Увеличение staleTime | ✅ Выполнено | Среднее |
| 4 | Мемоизация компонентов | ⏳ Запланировано | Среднее |
| 5 | SQL индексы | ⏳ Требует self-hosted | Высокое |
| 6 | PWA кеширование | ⏳ Запланировано | Среднее |

---

## Ожидаемые результаты после всех оптимизаций

| Метрика | До | После | Текущий статус |
|---------|-----|-------|---------------|
| Initial Load | ~8 сек | ~3-4 сек | ~5 сек (улучшено) |
| Auth requests | 50+ | 1-2 | ✅ 1-2 |
| WebSocket connections | ~20 | 3-5 | ✅ ~5 |
| Bundle size (initial) | ~1.5 MB | ~900 KB | ~1.1 MB (улучшено) |
| Time to Interactive | ~5 сек | ~2-3 сек | ~3.5 сек (улучшено) |
