

## Фильтрация конверсии: только новые клиенты

### Проблема

Существующие клиенты в базе почти наверняка попадут в "пролонгацию", но не все из них есть в таблице `online_payments`. Это искажает статистику A/B тестов. Кроме того, склеенные клиенты (merged) — это фактически старые клиенты, их тоже нельзя считать новыми.

### Решение

Добавить проверку "свежести" клиента в оба триггера:

1. **Клиент считается новым** только если `clients.created_at >= persona_ab_tests.started_at` (дата запуска теста)
2. **Склеенный клиент** (когда новый клиент был merged с существующим) определяется по тому, что целевой клиент (`primary`) имеет `created_at < started_at` --- значит это старый клиент, конверсия = `'prolonged'`

### Логика в триггере оплаты (`track_ab_conversion`)

```text
has_pending_payment: false -> true
  |
  v
Найти A/B assignment для client_id
  |
  v
Проверить: clients.created_at >= persona_ab_tests.started_at?
  |
  +--> НЕТ (старый клиент или склеенный) --> conversion_event = 'prolonged'
  |
  +--> ДА (новый клиент) --> проверить online_payments за год:
        |
        +--> count = 0 --> conversion_event = 'paid'
        +--> count > 0 --> conversion_event = 'prolonged'
```

### Логика в триггере пробного (`track_ab_trial_conversion`)

Без изменений --- запись на пробное не зависит от "свежести", это всегда первичное касание.

### Технические детали

**Файл: `docs/sql-optimizations/track_ab_conversion_trigger.sql`**

Изменения в функции `track_ab_conversion()`:

- Добавить переменную `v_test_started_at TIMESTAMPTZ`
- Перед проверкой платежей --- получить `started_at` из `persona_ab_tests` через JOIN с `persona_ab_assignments`:
  ```sql
  SELECT t.started_at INTO v_test_started_at
  FROM persona_ab_assignments a
  JOIN persona_ab_tests t ON t.id = a.test_id
  WHERE a.client_id = NEW.id
    AND t.status = 'running'
  LIMIT 1;
  ```
- Если `NEW.created_at < v_test_started_at` --- клиент старый, сразу ставим `'prolonged'`
- Иначе --- текущая логика проверки `online_payments`

Обновить комментарии в заголовке SQL-файла для отражения новой логики.

