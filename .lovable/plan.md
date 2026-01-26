
# План: Добавление вкладки "Звонки" в System Monitor

## Обзор
Добавляем новую вкладку "Звонки" в System Monitor для просмотра последних звонков из self-hosted API. Вкладка позволит администраторам мониторить все звонки системы с фильтрами и быстрым доступом к деталям.

## Архитектура решения

```text
+-------------------+        +-----------------------+
|   SystemMonitor   |  -->   |  CallLogsTab (новый)  |
+-------------------+        +-----------------------+
                                       |
                                       v
                            +--------------------+
                            |   selfHostedPost   |
                            |   get-call-logs    |
                            +--------------------+
                                       |
                                       v
                            +--------------------+
                            |  self-hosted DB    |
                            |    call_logs       |
                            +--------------------+
```

## Детали реализации

### 1. Новый компонент CallLogsTab

**Файл:** `src/components/admin/CallLogsTab.tsx`

Компонент включает:
- Таблицу с колонками: Дата/время, Направление, Номер, Статус, Длительность, Менеджер
- Фильтры: статус (все/отвеченные/пропущенные), направление (все/входящие/исходящие), период
- Пагинация (offset-based, limit 50)
- Возможность открыть CallDetailModal для детального просмотра
- Автообновление при нажатии кнопки "Обновить"

Визуальные элементы:
- Иконки направления (входящий/исходящий)
- Цветовые бейджи статуса (зеленый - отвечен, красный - пропущен, желтый - занято)
- Форматированная длительность (мм:сс)

### 2. Интеграция в SystemMonitor

**Файл:** `src/pages/SystemMonitor.tsx`

Изменения:
- Добавить import для Phone иконки и CallLogsTab компонента
- Добавить новый TabsTrigger "Звонки" с иконкой Phone
- Добавить TabsContent с CallLogsTab

### 3. Использование существующего Edge Function

Edge Function `get-call-logs` уже поддерживает все необходимые операции:
- `action: 'list'` - список всех звонков с пагинацией
- Фильтры: `status`, `direction`, `dateFrom`, `dateTo`, `managerId`
- Возвращает данные с join на `clients` таблицу

## Структура компонента CallLogsTab

```text
+------------------------------------------+
|  Фильтры: [Статус ▼] [Направление ▼]     |
|           [Период: от - до]   [Обновить] |
+------------------------------------------+
|  Таблица звонков                         |
|  +-----------------------------------------+
|  | Дата      | ← | Номер    | Статус | ... |
|  | 26.01 14: | ↓  | +7912... | ✓      | 2м  |
|  | 26.01 13: | ↑  | +7903... | ✗      | -   |
|  +-----------------------------------------+
+------------------------------------------+
|  Показано 1-50 из 234 | [<] [1] [2] [>]  |
+------------------------------------------+
```

## Файлы для изменения

| Файл | Действие | Описание |
|------|----------|----------|
| `src/components/admin/CallLogsTab.tsx` | Создать | Новый компонент вкладки звонков |
| `src/pages/SystemMonitor.tsx` | Изменить | Добавить вкладку и импорты |

## Технические детали

### Типы данных

```typescript
interface CallLog {
  id: string;
  phone_number: string;
  direction: 'incoming' | 'outgoing';
  status: 'initiated' | 'answered' | 'missed' | 'busy' | 'failed';
  duration_seconds: number | null;
  started_at: string;
  manager_name: string | null;
  clients?: { id: string; name: string; phone: string } | null;
}

interface CallLogsFilters {
  status?: string;
  direction?: string;
  dateFrom?: string;
  dateTo?: string;
}
```

### API запрос

```typescript
const response = await selfHostedPost('get-call-logs', {
  action: 'list',
  limit: 50,
  offset: page * 50,
  filters: {
    status: statusFilter,
    direction: directionFilter,
    dateFrom: dateRange?.from?.toISOString(),
    dateTo: dateRange?.to?.toISOString()
  }
});
```

## Зависимости

Все необходимые компоненты уже есть в проекте:
- UI компоненты: Table, Badge, Button, Select, DatePickerWithRange, ScrollArea, Skeleton
- Модальное окно: CallDetailModal (переиспользуем)
- API: selfHostedPost
- Иконки: Phone, PhoneIncoming, PhoneOutgoing, Clock, RefreshCw
