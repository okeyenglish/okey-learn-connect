

## Исправление триггера конверсии A/B тестов

### Проблема
Текущий триггер неверно интерпретирует колонки:
- `portal_enabled` — административное действие, не конверсия
- `has_pending_payment` — триггер срабатывал при сбросе в `false`, а конверсия — когда ставится `true` (клиент оплатил)

### Новая логика

Два конверсионных события:

1. **Оплата через эквайринг** — `has_pending_payment` меняется на `true` (клиент оплатил онлайн). Событие: `'paid'`
2. **Запись на пробное занятие** — создание записи в `trial_lesson_requests` с телефоном клиента. Событие: `'trial_booked'`

### Изменения

**Файл: `docs/sql-optimizations/track_ab_conversion_trigger.sql`** — полная переработка:

1. **Триггер на `clients`**: отслеживает только `has_pending_payment: false -> true` (событие `'paid'`)
2. **Новый триггер на `trial_lesson_requests`**: при вставке новой записи ищет клиента по совпадению телефона и обновляет `persona_ab_assignments` (событие `'trial_booked'`)

### Технические детали

```text
clients UPDATE (has_pending_payment: false -> true)
  |
  v
track_ab_conversion() --> UPDATE persona_ab_assignments SET converted=true, conversion_event='paid'

trial_lesson_requests INSERT
  |
  v
track_ab_trial_conversion() --> найти client_id по phone --> UPDATE persona_ab_assignments SET converted=true, conversion_event='trial_booked'
```

- Оба триггера: `SECURITY DEFINER`, `search_path = public`
- Обновляется только первая неконвертированная запись (`converted = false`)
- Комментарии в заголовке SQL обновлены под новую логику

