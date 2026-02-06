

## Отключение уведомлений активности на мобильных устройствах

### Проблема

На мобильных устройствах срабатывают:
1. **Алерты низкой активности** (`useActivityTracker`) — звук + сообщение AI
2. **Feedback при смене вкладки** (`useTabFeedback`) — вопрос от AI помощника

Это нежелательно, так как мобильные устройства используются эпизодически.

### Решение

Добавить проверку на мобильное устройство в оба хука и пропускать логику уведомлений.

---

### Технический план

#### 1. Файл: `src/hooks/useActivityTracker.ts`

**Изменения:**

```typescript
// Добавить импорт
import { useIsMobile } from './use-mobile';

// В начале хука добавить:
const isMobile = useIsMobile();

// В useEffect для алертов (строка 333) добавить проверку:
useEffect(() => {
  // Skip alerts on mobile devices
  if (isMobile) return;
  
  // Grace period after mount - wait for server sync before checking
  const timeSinceMount = Date.now() - mountTimeRef.current;
  if (timeSinceMount < MOUNT_GRACE_PERIOD) return;
  // ... остальная логика без изменений
}, [activityPercentage, sessionDuration, state.lowActivityAlertShown, onLowActivity, isMobile]);
```

---

#### 2. Файл: `src/hooks/useTabFeedback.ts`

**Изменения:**

```typescript
// Добавить импорт
import { useIsMobile } from './use-mobile';

// В начале хука добавить:
const isMobile = useIsMobile();

// В handleVisibilityChange добавить проверку:
const handleVisibilityChange = useCallback(() => {
  // Skip tab feedback on mobile devices
  if (isMobile) return;
  
  if (!enabled || !user || sessionAskedRef.current) return;
  // ... остальная логика без изменений
}, [enabled, user, minAwayTime, onShowFeedbackRequest, isMobile]);
```

---

### Изменяемые файлы

| Файл | Изменения |
|------|-----------|
| `src/hooks/useActivityTracker.ts` | Импорт `useIsMobile`, проверка `if (isMobile) return` в useEffect для алертов |
| `src/hooks/useTabFeedback.ts` | Импорт `useIsMobile`, проверка `if (isMobile) return` в handleVisibilityChange |

### Ожидаемый результат

- ✅ На мобильных устройствах (ширина < 768px):
  - НЕ показываются предупреждения о низкой активности
  - НЕ показывается feedback при смене вкладки
- ✅ На десктопе функционал остаётся без изменений
- ✅ Трекинг активности продолжает работать на всех устройствах (для статистики в админке)

