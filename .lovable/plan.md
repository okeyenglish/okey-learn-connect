
# Дашборд аналитики проиндексированных диалогов

## Обзор

Создание аналитического дашборда для визуализации проиндексированных диалогов из системы обучения AI. Дашборд будет отображать ключевые метрики: конверсию по категориям, средний балл качества, и топ проблемных паттернов.

## Архитектура

```text
+------------------------+
|   Admin Panel          |
|   (ai-training section)|
+------------------------+
           |
           v
+------------------------+
| ConversationIndexing   |  <-- Existing panel
| Panel (индексация)     |
+------------------------+
           |
           v
+------------------------+
| ConversationAnalytics  |  <-- NEW
| Dashboard (аналитика)  |
+------------------------+
           |
           v
+------------------------+
| Edge Function:         |
| conversation-analytics |  <-- NEW
| (self-hosted API)      |
+------------------------+
           |
           v
+------------------------+
| conversation_examples  |
| (self-hosted DB)       |
+------------------------+
```

## Компоненты дашборда

### 1. KPI карточки (верхняя строка)
- **Всего проиндексировано**: Общее число диалогов в базе
- **Средний балл качества**: 1-5 с цветовой индикацией
- **Конверсия**: % диалогов с outcome = converted
- **Одобрено для RAG**: % диалогов с approved = true

### 2. Конверсия по категориям (сценариям)
- Горизонтальный bar chart
- Сценарии: new_lead, returning, complaint, upsell, reactivation, info_request, scheduling, payment
- Цветовая кодировка по конверсии

### 3. Распределение качества
- Pie chart с распределением оценок 1-5
- Процентное соотношение

### 4. Топ проблем
- Таблица с низкокачественными диалогами (quality_score < 3)
- Группировка по сценариям
- Примеры context_summary для анализа

### 5. Тренды по дням (опционально)
- Line chart с динамикой индексации
- Средняя оценка по дням

## Технические детали

### Новый Edge Function: `conversation-analytics`
```typescript
// Агрегирует данные из conversation_examples
interface AnalyticsResponse {
  total: number;
  avgQuality: number;
  approvedCount: number;
  byScenario: Array<{
    scenario: string;
    count: number;
    avgQuality: number;
    conversions: number;
    conversionRate: number;
  }>;
  byOutcome: Record<string, number>;
  qualityDistribution: Record<string, number>;
  lowQualityExamples: Array<{
    scenario: string;
    quality: number;
    summary: string;
    created_at: string;
  }>;
}
```

### Новый компонент: `ConversationAnalyticsDashboard.tsx`
- Использует `selfHostedGet` для запроса данных
- Визуализация через Recharts (уже установлен)
- Skeleton-загрузка
- Автообновление каждые 60 секунд

### Интеграция в Admin Panel
- Добавление нового пункта в sidebar: "Аналитика диалогов"
- Или расширение существующего "Обучение AI" табами

## План реализации

### Шаг 1: Edge Function
Создать `supabase/functions/conversation-analytics/index.ts`:
- Агрегация по scenario_type
- Расчет конверсии
- Получение низкокачественных примеров
- Распределение качества

### Шаг 2: Dashboard компонент
Создать `src/components/admin/ConversationAnalyticsDashboard.tsx`:
- 4 KPI карточки сверху
- Bar chart конверсии по сценариям
- Pie chart распределения качества
- Таблица проблемных диалогов

### Шаг 3: Интеграция
- Обновить `ConversationIndexingPanel.tsx` добавив табы:
  - Tab 1: Индексация (текущий функционал)
  - Tab 2: Аналитика (новый дашборд)

### Шаг 4: Типы
- Добавить интерфейсы в `database.types.ts` для conversation_examples

## Зависимости

Используются существующие библиотеки:
- `recharts` - графики
- `@tanstack/react-query` - кеширование данных
- Существующие UI компоненты (Card, Table, Badge, Tabs)

## Особенности self-hosted

Поскольку данные хранятся на self-hosted сервере (`api.academyos.ru`):
1. Дашборд использует `selfHostedGet` для API вызовов
2. Edge Function должен быть развернут на self-hosted
3. Код можно скопировать для деплоя вручную
