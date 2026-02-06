
## Исправление: Синхронизация сессий активности между устройствами

### Проблема

При входе на новом устройстве или после перезагрузки:
1. `sessionStart` сбрасывается на текущее время
2. `activeTime` и `idleTime` сбрасываются на 0
3. Данные с сервера приходят, но `sessionStart` остаётся локальным
4. Это приводит к некорректному расчёту `activityPercentage`

**Пример:**
- Сервер: `activeSeconds = 3600` (1 час), `sessionStart = 09:00`
- После перезагрузки в 12:00: `sessionStart = 12:00` (локальный)
- `sessionDuration = 12:00 - 12:00 = 0`
- `activityPercentage = (3600000 / 1000) * 100 = 360000%` ← некорректно!

### Решение

1. **Синхронизировать `sessionStart` с сервера** - если на сервере есть время начала сессии, использовать его
2. **Добавить grace period** - не показывать AI popup в первую минуту после загрузки (время на синхронизацию)
3. **Отдельное хранение флага AI alert** - чтобы не сбрасывать его при перезагрузке

---

### Технический план

#### Файл: `src/hooks/useActivityTracker.ts`

**1. Добавить константы и ref для отслеживания времени загрузки**

```typescript
const MOUNT_GRACE_PERIOD = 60_000; // 1 минута после загрузки - не показывать алерт
const ALERT_SHOWN_KEY = 'staff-activity-alert-shown-date';
```

**2. Обновить интерфейс ActivityState**

Добавить опциональное поле для отслеживания синхронизации:
```typescript
interface ActivityState {
  // ... существующие поля
  serverSessionStartApplied: boolean; // Флаг что sessionStart синхронизирован
}
```

**3. Обновить useEffect для синхронизации с сервером (строки 183-230)**

Добавить синхронизацию `sessionStart`:

```typescript
useEffect(() => {
  if (!serverBaseline) return;

  const serverActiveMs = serverBaseline.activeSeconds * 1000;
  const serverIdleMs = serverBaseline.idleSeconds * 1000;

  setState(prev => {
    const updates: Partial<ActivityState> = {};
    let hasChanges = false;

    // Синхронизируем sessionStart с сервера (только один раз)
    if (serverBaseline.sessionStart && !prev.serverSessionStartApplied) {
      const serverSessionStart = new Date(serverBaseline.sessionStart).getTime();
      // Используем серверный sessionStart если он раньше локального
      if (serverSessionStart < prev.sessionStart) {
        updates.sessionStart = serverSessionStart;
        hasChanges = true;
      }
      updates.serverSessionStartApplied = true;
      hasChanges = true;
    }

    // Синхронизируем activeTime/idleTime
    const serverHasNewData = 
      serverBaseline.activeSeconds > prev.lastServerActiveSeconds ||
      serverBaseline.idleSeconds > prev.lastServerIdleSeconds;

    if (serverHasNewData) {
      updates.activeTime = Math.max(prev.activeTime, serverActiveMs);
      updates.idleTime = Math.max(prev.idleTime, serverIdleMs);
      updates.lastServerActiveSeconds = serverBaseline.activeSeconds;
      updates.lastServerIdleSeconds = serverBaseline.idleSeconds;
      hasChanges = true;
    }

    if (!hasChanges) return prev;

    const newState = { ...prev, ...updates };
    saveState(newState);
    return newState;
  });
}, [serverBaseline]);
```

**4. Обновить проверку AI popup (строки 298-340)**

Добавить проверку grace period и отдельное хранение флага алерта:

```typescript
const mountTimeRef = useRef(Date.now());

useEffect(() => {
  // Grace period после загрузки - ждём синхронизации с сервером
  const timeSinceMount = Date.now() - mountTimeRef.current;
  if (timeSinceMount < MOUNT_GRACE_PERIOD) return;

  // Проверяем, был ли алерт уже показан сегодня (отдельно от state)
  const today = new Date().toDateString();
  const alertShownDate = localStorage.getItem(ALERT_SHOWN_KEY);
  const alertAlreadyShownToday = alertShownDate === today;
  
  if (activityPercentage < threshold && !alertAlreadyShownToday) {
    // Показать алерт
    if (onLowActivity) {
      onLowActivity(activityPercentage);
    } else {
      playNotificationSound(0.5, 'activity_warning');
      sendActivityWarningMessage(activityPercentage);
    }
    
    // Сохранить флаг отдельно от state
    localStorage.setItem(ALERT_SHOWN_KEY, today);
    
    setState(prev => ({ ...prev, lowActivityAlertShown: true }));
  }
  
  // Сброс флага при высокой активности
  if (activityPercentage >= threshold + 5 && state.lowActivityAlertShown) {
    localStorage.removeItem(ALERT_SHOWN_KEY);
    setState(prev => ({ ...prev, lowActivityAlertShown: false }));
  }
}, [activityPercentage, sessionDuration, state.lowActivityAlertShown, onLowActivity]);
```

**5. Обновить loadState (строки 30-58)**

Не сбрасывать `serverSessionStartApplied` при свежей сессии:

```typescript
const loadState = (): Partial<ActivityState> => {
  try {
    const currentSessionId = sessionStorage.getItem(SESSION_KEY);
    const isFreshSession = !currentSessionId;
    
    if (isFreshSession) {
      sessionStorage.setItem(SESSION_KEY, Date.now().toString());
      // Возвращаем минимальное состояние - ждём данные с сервера
      return {
        serverSessionStartApplied: false, // Будет синхронизировано позже
      };
    }
    
    // ... остальная логика загрузки из localStorage
  } catch {
    // Ignore errors
  }
  return {};
};
```

---

### Изменяемые файлы

| Файл | Изменения |
|------|-----------|
| `src/hooks/useActivityTracker.ts` | Синхронизация sessionStart с сервера, grace period, отдельное хранение флага алерта |

### Ожидаемый результат

1. ✅ При входе на новом устройстве - данные синхронизируются с сервером
2. ✅ `sessionStart` берётся с сервера (если есть), а не локальный
3. ✅ `activityPercentage` рассчитывается корректно
4. ✅ AI Помощник НЕ открывается при перезагрузке (grace period 1 минута)
5. ✅ Алерт не дублируется в течение дня (отдельный флаг в localStorage)
