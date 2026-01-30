

# План оптимизации: Устранение дублирующих auth-запросов

## Обнаруженная проблема

При загрузке страницы происходит **~50 одинаковых сетевых запросов** к `/auth/v1/user` за 8 секунд. Это вызвано тем, что 52 файла вызывают `supabase.auth.getUser()` напрямую, игнорируя централизованный `AuthProvider`.

### Влияние на производительность:
- Каждый `getUser()` = 1 сетевой запрос (~50-150ms)
- 50 параллельных запросов = блокировка сети + нагрузка на сервер
- Это **основная причина** ощущения "медленной загрузки"

## Решение

### Фаза 1: Создать централизованный хелпер для получения userId

Создать `src/lib/authHelpers.ts`:
```typescript
// Кэшированный userId для mutation-функций
let cachedUserId: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

export const getCachedUserId = async (): Promise<string | null> => {
  const now = Date.now();
  if (cachedUserId && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedUserId;
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  cachedUserId = user?.id ?? null;
  cacheTimestamp = now;
  return cachedUserId;
};

// Сброс при logout
export const clearAuthCache = () => {
  cachedUserId = null;
  cacheTimestamp = 0;
};
```

### Фаза 2: Рефакторинг хуков (по приоритету)

**Высокий приоритет** (вызываются при загрузке страницы):

| Файл | Паттерн | Исправление |
|------|---------|-------------|
| `useChatPresence.ts` | `getUser()` в useEffect | Принимать `userId` как параметр |
| `useMessageReadStatus.ts` | `getUser()` в mutation | Использовать `useAuth().user` |
| `useMessageReactions.ts` | 3x `getUser()` в mutations | Использовать `useAuth().user` |
| `useTeacherMessages.ts` | `getUser()` в mutations | Использовать `useAuth().user` |

**Средний приоритет** (вызываются по действию):

| Файл | Исправление |
|------|-------------|
| `useNotifications.ts` | Заменить на `getCachedUserId()` |
| `useStudentTags.ts` | Использовать `useAuth().user` |
| `useStudentOperationLogs.ts` | Использовать `useAuth().user` |

### Фаза 3: Обновить AuthProvider

Добавить синхронизацию кэша при изменении auth-состояния:
```typescript
// В onAuthStateChange:
if (session?.user) {
  setCachedUserId(session.user.id);
} else {
  clearAuthCache();
}
```

## Технические детали

### Паттерн #1: Хуки с useEffect
```typescript
// БЫЛО:
useEffect(() => {
  const { data } = await supabase.auth.getUser();
  userId = data.user?.id;
});

// СТАЛО (вариант А - props):
const { user } = useAuth();
useEffect(() => {
  if (!user) return;
  // использовать user.id
}, [user]);

// СТАЛО (вариант Б - опциональный параметр):
export const useChatPresence = (userId?: string) => {
  const { user } = useAuth();
  const effectiveUserId = userId ?? user?.id;
```

### Паттерн #2: Mutations
```typescript
// БЫЛО:
mutationFn: async (data) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  // ...
}

// СТАЛО:
const { user } = useAuth();
mutationFn: async (data) => {
  if (!user) throw new Error('Not authenticated');
  // использовать user.id напрямую
}
```

## Ожидаемый результат

| Метрика | До | После |
|---------|-----|-------|
| Запросы `/auth/v1/user` | ~50 | 1-2 |
| Время загрузки | +3-5 сек | -3-5 сек |
| Нагрузка на сеть | Высокая | Минимальная |

## Шаги реализации

1. Создать `authHelpers.ts` с кэшированием
2. Обновить `AuthProvider` для синхронизации кэша
3. Рефакторить 10 файлов высокого приоритета
4. Рефакторить остальные 42 файла по мере работы над ними

