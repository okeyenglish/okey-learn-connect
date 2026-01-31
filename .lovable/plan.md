
# План: Оптимизация производительности CRM

## Выявленные проблемы

### 1. Дублирование вызовов `fetchProfile` в useAuth
**Причина**: При загрузке страницы происходит race condition:
- `onAuthStateChange` слушатель срабатывает при инициализации
- `getSession()` тоже вызывает `fetchProfile` если найдена сессия
- Оба вызова происходят независимо, создавая 2x запросов к БД

**Текущий код (строки 187-292)**:
```typescript
// Listener - может вызвать fetchProfile
onAuthStateChange(async (event, session) => {
  if (session?.user) {
    fetchProfile(session.user.id); // Вызов #1
  }
});

// Также вызывает fetchProfile
getSession().then(({ session }) => {
  if (session?.user) {
    fetchProfile(session.user.id); // Вызов #2 - ДУБЛИКАТ!
  }
});
```

### 2. Отсутствие Circuit Breaker в usePostCallModeration
**Причина**: При ошибках self-hosted сервера (500) хук продолжает поллинг каждые 10 секунд, создавая лишнюю нагрузку на сеть и UI.

---

## Решение

### Задача 1: Добавить флаг `isInitialized` в useAuth

Добавить ref для отслеживания инициализации и предотвращения дублирования:

```typescript
const isInitializedRef = useRef(false);
const currentUserIdRef = useRef<string | null>(null);

// В onAuthStateChange:
if (session?.user && !isInitializedRef.current) {
  isInitializedRef.current = true;
  currentUserIdRef.current = session.user.id;
  fetchProfile(session.user.id);
} else if (session?.user && currentUserIdRef.current !== session.user.id) {
  // Только если сменился пользователь
  currentUserIdRef.current = session.user.id;
  fetchProfile(session.user.id);
}

// В getSession:
if (session?.user && !isInitializedRef.current) {
  isInitializedRef.current = true;
  currentUserIdRef.current = session.user.id;
  fetchProfile(session.user.id);
}
```

### Задача 2: Добавить Circuit Breaker в usePostCallModeration

Добавить механизм отключения поллинга после серии ошибок:

```typescript
const consecutiveErrorsRef = useRef(0);
const circuitOpenUntilRef = useRef<number | null>(null);

const CIRCUIT_BREAKER_THRESHOLD = 3;  // Количество ошибок до отключения
const CIRCUIT_BREAKER_TIMEOUT = 5 * 60 * 1000; // 5 минут паузы

const checkForEndedCalls = useCallback(async () => {
  // Проверка circuit breaker
  if (circuitOpenUntilRef.current && Date.now() < circuitOpenUntilRef.current) {
    console.log('[usePostCallModeration] Circuit breaker open, skipping poll');
    return;
  }
  
  // Сброс circuit breaker если время вышло
  if (circuitOpenUntilRef.current && Date.now() >= circuitOpenUntilRef.current) {
    circuitOpenUntilRef.current = null;
    consecutiveErrorsRef.current = 0;
  }

  try {
    const response = await selfHostedPost(...);
    
    if (!response.success) {
      consecutiveErrorsRef.current++;
      if (consecutiveErrorsRef.current >= CIRCUIT_BREAKER_THRESHOLD) {
        console.warn('[usePostCallModeration] Circuit breaker triggered');
        circuitOpenUntilRef.current = Date.now() + CIRCUIT_BREAKER_TIMEOUT;
      }
      return;
    }
    
    // Успешный запрос - сброс счётчика
    consecutiveErrorsRef.current = 0;
    // ... обработка данных
  } catch (error) {
    consecutiveErrorsRef.current++;
    if (consecutiveErrorsRef.current >= CIRCUIT_BREAKER_THRESHOLD) {
      circuitOpenUntilRef.current = Date.now() + CIRCUIT_BREAKER_TIMEOUT;
    }
  }
}, [...]);
```

---

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `src/hooks/useAuth.tsx` | Добавить `isInitializedRef` и `currentUserIdRef` для предотвращения дублирования вызовов `fetchProfile` |
| `src/hooks/usePostCallModeration.ts` | Добавить circuit breaker с порогом 3 ошибки и паузой 5 минут |

---

## Ожидаемый результат

После изменений:
- `fetchProfile` вызывается **1 раз** вместо 4 при загрузке страницы
- При недоступности self-hosted сервера поллинг автоматически приостанавливается на 5 минут
- Снижение нагрузки на сеть и улучшение отзывчивости UI
