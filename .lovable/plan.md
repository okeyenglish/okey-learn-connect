
## Исправление: AI Ассистент открывается при каждой перезагрузке

### Проблема

При жёсткой перезагрузке браузера (F5 / Cmd+R) окно AI Помощника автоматически открывается из-за срабатывания алерта о низкой активности.

### Причина

Хук `useActivityTracker` хранит состояние в `localStorage`:
- `sessionStart` — время начала сессии
- `activeTime` — накопленное активное время  
- `lowActivityAlertShown` — флаг показа алерта

**При перезагрузке (тот же день):**
1. Загружается старый `sessionStart` (например, с утра)
2. `sessionDuration = Date.now() - sessionStart` = несколько часов (включая время когда браузер был закрыт)
3. `activityPercentage = activeTime / sessionDuration` резко падает (т.к. пользователь не был активен пока браузер закрыт)
4. `lowActivityAlertShown = false` из старой сессии
5. Проверка `sessionDuration < 5 минут` проходит (т.к. sessionDuration огромный)
6. Срабатывает алерт → открывается AI Помощник

### Решение

Использовать `sessionStorage` для определения "свежей загрузки страницы" и сбрасывать состояние активности при новой сессии браузера.

---

### Технический план

#### Файл: `src/hooks/useActivityTracker.ts`

**1. Добавить константу для отслеживания браузерной сессии**

```typescript
const SESSION_KEY = 'staff-activity-session-id';
```

**2. Обновить функцию loadState для проверки свежей сессии**

```typescript
const loadState = (): Partial<ActivityState> => {
  try {
    // Check if this is a fresh browser session
    const currentSessionId = sessionStorage.getItem(SESSION_KEY);
    const isFreshSession = !currentSessionId;
    
    if (isFreshSession) {
      // Mark this browser session as started
      sessionStorage.setItem(SESSION_KEY, Date.now().toString());
      // Don't load old state for fresh sessions
      return {};
    }
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Reset if session is from a different day
      const today = new Date().toDateString();
      const sessionDay = new Date(parsed.sessionStart).toDateString();
      if (today !== sessionDay) {
        return {};
      }
      return parsed;
    }
  } catch {
    // Ignore errors
  }
  return {};
};
```

**3. Альтернативно: Добавить задержку перед первым срабатыванием алерта**

В useEffect для проверки низкой активности (строки 287-328) добавить ref для отслеживания времени монтирования:

```typescript
const mountTimeRef = useRef(Date.now());
const MOUNT_GRACE_PERIOD = 60_000; // 1 минута после загрузки

// В useEffect:
const timeSinceMount = Date.now() - mountTimeRef.current;
if (timeSinceMount < MOUNT_GRACE_PERIOD) return; // Не показывать алерт сразу после загрузки
```

---

### Изменяемые файлы

| Файл | Изменения |
|------|-----------|
| `src/hooks/useActivityTracker.ts` | Добавить проверку свежей браузерной сессии через sessionStorage |

### Ожидаемый результат

- AI Помощник НЕ будет открываться автоматически при перезагрузке страницы
- Алерт о низкой активности будет срабатывать только после реального периода бездействия в текущей сессии браузера
- Сохраняется логика работы в пределах одной вкладки (без перезагрузки)
