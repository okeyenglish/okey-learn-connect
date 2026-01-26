
# Показ имени сотрудника и текста черновика в реальном времени

## Обзор

Реализуем отображение имени конкретного сотрудника (вместо "Менеджер печатает...") и текста его черновика в реальном времени с throttle 500ms.

---

## Текущее состояние

### Таблица `typing_status`
```text
| Колонка    | Тип       |
|------------|-----------|
| id         | uuid      |
| user_id    | uuid      |
| client_id  | uuid      |
| is_typing  | boolean   |
| updated_at | timestamp |
```

### Хук `useTypingStatus`
- Подписывается на изменения в `typing_status` по `client_id`
- Возвращает `getTypingMessage()` — всегда "Менеджер печатает..."
- Нет информации о имени и тексте черновика

---

## Изменения

### 1. Миграция БД — добавление колонок

```sql
ALTER TABLE public.typing_status
ADD COLUMN IF NOT EXISTS draft_text TEXT,
ADD COLUMN IF NOT EXISTS manager_name TEXT;
```

### 2. Обновление типов — `database.types.ts`

```typescript
export interface TypingStatus {
  id: string;
  user_id: string;
  client_id: string;
  is_typing: boolean;
  updated_at: string;
  draft_text: string | null;    // NEW
  manager_name: string | null;  // NEW
}
```

### 3. Переработка хука `useTypingStatus`

#### Ключевые изменения:

1. **Throttling 500ms** — при вводе текста обновления отправляются не чаще раза в 500ms
2. **Передача `draft_text`** — текст черновика (первые 100 символов)
3. **Передача `manager_name`** — имя сотрудника из профиля
4. **Расширенный `getTypingMessage()`** — возвращает имя и текст

```typescript
// Новый интерфейс для возврата
interface TypingInfo {
  managerName: string;
  draftText: string | null;
}

// updateTypingStatus с draft_text
const updateTypingStatus = useCallback(
  throttle(async (isTyping: boolean, draftText?: string) => {
    // ... payload includes draft_text and manager_name
  }, 500),
  [clientId]
);

// getTypingInfo возвращает детальную информацию
const getTypingInfo = useCallback((): TypingInfo | null => {
  const typingUser = typingUsers.find(t => t.is_typing);
  if (!typingUser) return null;
  return {
    managerName: typingUser.manager_name || 'Менеджер',
    draftText: typingUser.draft_text || null,
  };
}, [typingUsers]);
```

### 4. Обновление `ChatArea.tsx`

#### Изменения в поле ввода:
```typescript
// При изменении текста передаём draft
const handleMessageChange = (value: string) => {
  setMessage(value);
  updateTypingStatus(true, value.slice(0, 100)); // первые 100 символов
};
```

#### Изменения в индикаторе:
```tsx
// В заголовке чата
{getTypingInfo() && (
  <div className="text-xs text-orange-600 italic animate-pulse">
    <span className="font-medium">{getTypingInfo()?.managerName}</span>
    {' печатает: '}
    <span className="text-orange-500">"{getTypingInfo()?.draftText}"</span>
  </div>
)}

// В заблокированном поле ввода
placeholder={
  isOtherUserTyping 
    ? `${getTypingInfo()?.managerName} печатает...` 
    : "Введите сообщение..."
}
```

---

## Технические детали

### Throttle реализация

```typescript
import { useCallback, useRef } from 'react';

function useThrottle<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): T {
  const lastCall = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      fn(...args);
    } else {
      // Schedule trailing call
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now();
        fn(...args);
      }, delay - (now - lastCall.current));
    }
  }, [fn, delay]) as T;
}
```

### Ограничение текста черновика

- Максимум 100 символов для экономии трафика
- Обрезка с "..." при превышении

### Файлы для изменения

| Файл | Изменения |
|------|-----------|
| SQL миграция | Добавить `draft_text` и `manager_name` колонки |
| `src/integrations/supabase/database.types.ts` | Обновить интерфейс `TypingStatus` |
| `src/hooks/useTypingStatus.ts` | Добавить throttle, draft_text, manager_name |
| `src/components/crm/ChatArea.tsx` | Передавать текст в `updateTypingStatus`, обновить UI |
| `src/components/crm/CommunityChatArea.tsx` | Аналогичные изменения UI |
| `src/components/crm/CorporateChatArea.tsx` | Аналогичные изменения UI |

### Оценка нагрузки

- **С throttle 500ms**: ~2 запроса/сек на активного печатающего
- **20 одновременных менеджеров**: ~40 req/s (приемлемо для Supabase Realtime)
- **Размер payload**: ~200 байт (user_id + client_id + 100 chars + name)

---

## Визуальный результат

### Заголовок чата (когда другой сотрудник печатает):
```text
Иван Петров
+7 999 123-45-67
┌─────────────────────────────────────┐
│ Анна Сидорова печатает: "Добрый... │
└─────────────────────────────────────┘
```

### Заблокированное поле ввода:
```text
┌─────────────────────────────────────┐
│ 🔒 Анна Сидорова печатает...       │
└─────────────────────────────────────┘
```

---

## Безопасность и приватность

1. **RLS политики** — пользователи видят только typing_status для клиентов своей организации
2. **Краткий текст** — только первые 100 символов, не полное сообщение
3. **Автоочистка** — draft_text очищается при `is_typing = false`
