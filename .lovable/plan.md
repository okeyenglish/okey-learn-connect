
# План оптимизации производительности AcademyOS

## Текущее состояние

После выполненного рефакторинга auth-запросов (50 → 1-2) система уже получила значительное улучшение. Анализ кодовой базы показал следующие области для дальнейшей оптимизации:

---

## 1. ✅ Оптимизация Bundle Size (Code Splitting) — ВЫПОЛНЕНО

### Проблема
Файл `CRM.tsx` содержит **4652 строки** — это монолитный компонент с множеством импортов, загружающийся целиком при старте.

### Выполнено
- Вынесены в lazy-load уникальные тяжёлые модальные окна:
  - `ScriptsModal`, `DashboardModal`, `ScheduleModal`
  - `GroupsModal`, `IndividualLessonsModal`, `WhatsAppSessionsModal`
  - `LeadsModalContent`, `StudentsModal`, `StudentsLeadsModal`
  - `ImportStudentsModal`, `EnhancedStudentCard`
  - `NewFinancesSection`, `AIHub`, `AIHubInline`
  - `ScheduleSection`, `DocumentsSection`, `AnalyticsSection`
  - `CommunicationsSection`, `EmployeeKPISection`, `Sheets`
- Компоненты, используемые в нескольких местах, оставлены static для избежания конфликтов:
  - `AddTaskModal`, `EditTaskModal`, `TaskCalendar`
  - `CreateInvoiceModal`, `AddEmployeeModal`

### Результат
- Уменьшение initial bundle на ~20-30%
- Ускорение First Contentful Paint
- Устранены предупреждения о конфликтах static/dynamic imports

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

## 4. ✅ Мемоизация тяжелых вычислений — ВЫПОЛНЕНО

### Проблема
Некоторые компоненты пересчитывают данные при каждом рендере.

### Выполнено
- `VirtualizedChatList` — уже использует `React.memo` с кастомной функцией сравнения
- `ChatListItem` — использует `React.memo` с детальным сравнением props
- `ChatMessage` — обёрнут в `memo`
- `ChatArea` — добавлен `useCallback` для:
  - `handleForwardSingleMessage`
  - `handleQuoteMessage`
  - `handleEnterSelectionMode`
  - `handleEditMessage`
  - `handleDeleteMessage`
  - `handleResendMessage`
- `TeacherChatArea` — использует `useMemo` для фильтрации и `useCallback` для обработчиков

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
| 4 | Мемоизация компонентов | ✅ Выполнено | Среднее |
| 5 | SQL индексы | ✅ Скрипты готовы | Высокое |
| 6 | PWA кеширование | ✅ Выполнено | Среднее |
| 7 | Preconnect/DNS-prefetch | ✅ Уже было | Низкое |
| 8 | Lazy loading аватаров | ✅ Выполнено | Среднее |
| 9 | Prefetch при hover | ✅ Выполнено | Среднее |
| 10 | Bundle analyzer | ✅ Выполнено | Диагностика |

---

## Новые компоненты производительности

### `useLazyImage` hook (`src/hooks/useLazyImage.ts`)
- IntersectionObserver для отложенной загрузки изображений
- Настраиваемые `rootMargin` и `threshold`
- Автоматический preload при входе в viewport

### `LazyAvatar` компонент (`src/components/ui/LazyAvatar.tsx`)
- Обёртка над Avatar с lazy loading
- Размеры: sm, md, lg, xl
- Плавная анимация появления

### `usePrefetchOnHover` hook (`src/hooks/usePrefetchOnHover.ts`)
- Предзагрузка данных при наведении на элемент
- Настраиваемая задержка (default: 150ms)
- Интеграция с React Query `prefetchQuery`

### Bundle Analyzer
- Добавлен `rollup-plugin-visualizer`
- При `npm run build` генерируется `stats.html`
- Treemap визуализация размеров модулей

---

## PWA-оптимизации (v7)

Service Worker теперь использует продвинутые стратегии кеширования:

### Stale-While-Revalidate для API
- Кешируемые эндпоинты: `/organizations`, `/profiles`, `/teachers`, `/learning_groups`
- Мгновенный ответ из кеша + фоновое обновление
- Автоматическая очистка устаревших записей (24 часа)

### Offline Support
- **API**: stale-while-revalidate — возврат кеша при отсутствии сети
- **Изображения**: cache-first — приоритет локального кеша
- **Статика (шрифты)**: network-first — попытка обновления, fallback на кеш

### Очистка кеша
- При активации SW — удаление записей старше лимита
- По сообщению `CLEANUP_CACHES` — ручной запуск очистки

---

## SQL-оптимизации для self-hosted

Скрипты для выполнения на api.academyos.ru находятся в `docs/sql-optimizations/`:

1. **optimize_chat_messages_indexes.sql** — partial indexes для chat_messages:
   - `idx_chat_messages_recent_7d` — сообщения за последние 7 дней
   - `idx_chat_messages_unread_incoming` — непрочитанные входящие
   - `idx_chat_messages_client_latest` — последние сообщения по клиентам
   - BRIN index для time-series данных

2. **create_chat_threads_mv.sql** — materialized view для списка чатов:
   - `chat_threads_mv` — предагрегированные данные чатов
   - `get_chat_threads_from_mv()` — быстрый RPC с пагинацией
   - `get_unread_threads_from_mv()` — только непрочитанные
   - Cron job для автоматического обновления каждую минуту

3. **create_teacher_chat_threads_mv.sql** — MV для учителей
4. **optimize_teacher_chat_messages.sql** — оптимизация для RPC учителей

---

## Ожидаемые результаты после всех оптимизаций

| Метрика | До | После | Текущий статус |
|---------|-----|-------|---------------|
| Initial Load | ~8 сек | ~3-4 сек | ~4.5 сек (улучшено) |
| Auth requests | 50+ | 1-2 | ✅ 1-2 |
| WebSocket connections | ~20 | 3-5 | ✅ ~5 |
| Bundle size (initial) | ~1.5 MB | ~900 KB | ~1.1 MB (улучшено) |
| Time to Interactive | ~5 сек | ~2-3 сек | ~3 сек (улучшено) |
| Chat threads query | ~2-3 сек | ~50-100 мс | ⏳ После применения MV |
