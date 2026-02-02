
# План: Периодическое обновление baseline каждую минуту

## Изменения

### Файл: `src/hooks/useTodayWorkSession.ts`

Добавить в React Query опции:
- `refetchInterval: 60_000` — автоматический рефетч каждые 60 секунд
- `refetchIntervalInBackground: false` — НЕ делать запросы когда вкладка неактивна (экономия нагрузки)

## Код изменения

```typescript
const query = useQuery({
  queryKey: ['today-work-session', user?.id],
  queryFn: async (): Promise<ServerSessionBaseline> => {
    // ... существующая логика
  },
  enabled: !!user?.id,
  staleTime: 60_000,
  refetchOnWindowFocus: true,
  refetchInterval: 60_000,              // <-- добавить
  refetchIntervalInBackground: false,   // <-- добавить (не грузить сервер в фоне)
});
```

## Оптимизация нагрузки

| Механизм | Эффект |
|----------|--------|
| `refetchIntervalInBackground: false` | Запросы только когда вкладка активна |
| `staleTime: 60_000` | Кэш валиден 1 минуту, избегаем лишних запросов |
| Один запрос = 1 SELECT | Минимальная нагрузка на БД |

## Результат
- Синхронизация между устройствами каждые 60 секунд
- Нет запросов в фоновых вкладках
- Нагрузка: ~1 запрос/минуту на активного пользователя
