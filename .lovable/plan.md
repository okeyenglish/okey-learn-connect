
# План: Улучшение превью рабочего дня

## Изменения

### 1. Улучшение отображения времени (formatTime)
**Текущее поведение**: Показывает "0м" при времени менее 60 секунд
**Новое поведение**: Показывает секунды если меньше минуты (например "45с")

### 2. Скрытие процента активности для коротких сессий  
**Текущее поведение**: Показывает процент сразу (может быть некорректным)
**Новое поведение**: Скрывает процент пока сессия < 5 минут

### 3. Время последнего звонка и сообщения
**Новые данные в tooltip**:
- Последний звонок: "14:32" (или "—" если нет звонков)
- Последнее сообщение: "14:45" (или "—" если нет)

---

## Технические изменения

### `src/hooks/useTodayCallsCount.ts`
Добавить возврат `lastCallTime`:
- Сортировка звонков по `created_at` DESC
- Возврат времени последнего звонка

### `src/hooks/useTodayMessagesCount.ts`
Добавить возврат `lastMessageTime`:
- Запрос последнего сообщения с `order('created_at', { ascending: false }).limit(1)`
- Возврат времени

### `src/components/crm/WorkdayPreviewWidget.tsx`
1. Обновить `formatTime`:
```typescript
const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}с`;
  }
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`;
};
```

2. Условный рендеринг процента активности:
```typescript
const MIN_SESSION_FOR_PERCENTAGE = 5 * 60 * 1000; // 5 минут
const showActivityPercentage = sessionDuration >= MIN_SESSION_FOR_PERCENTAGE;
```

3. Добавить в tooltip время последних действий:
```typescript
<span className="text-muted-foreground">Посл. звонок:</span>
<span className="font-medium">{lastCallTime || '—'}</span>

<span className="text-muted-foreground">Посл. сообщение:</span>
<span className="font-medium">{lastMessageTime || '—'}</span>
```

---

## Файлы для изменения
| Файл | Изменение |
|------|-----------|
| `useTodayCallsCount.ts` | Добавить `lastCallTime` |
| `useTodayMessagesCount.ts` | Добавить `lastMessageTime` |
| `WorkdayPreviewWidget.tsx` | formatTime + условный %, время последних действий |
