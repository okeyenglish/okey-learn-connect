

## Разделение первичных продаж и пролонгации в A/B тестах

### Логика определения

- **Новый клиент** (`'paid'`): у клиента нет подтверждённых платежей за последний год (или вообще нет платежей) в `online_payments`
- **Пролонгация** (`'prolonged'`): у клиента есть хотя бы один подтверждённый платёж за последний год

### Подход к трекингу

Используем два разных события в `persona_ab_assignments`:
- `conversion_event = 'paid'` — первичная продажа
- `conversion_event = 'prolonged'` — пролонгация

Для пролонгации: обновляем запись даже если `converted = true` (перезаписываем `conversion_event` на `'prolonged'`), а также добавляем колонку `prolongation_count` (INTEGER DEFAULT 0) в `persona_ab_assignments` для подсчёта количества пролонгаций. Это даёт гибкость при анализе.

### Изменения

**Файл: `docs/sql-optimizations/track_ab_conversion_trigger.sql`**

Переработка функции `track_ab_conversion()`:

```text
has_pending_payment: false -> true
  |
  v
Проверить online_payments:
  SELECT count(*) FROM online_payments
  WHERE client_id = NEW.id
    AND status = 'CONFIRMED'
    AND created_at > now() - interval '1 year'
  |
  +--> count = 0 --> conversion_event = 'paid', converted = true
  |
  +--> count > 0 --> conversion_event = 'prolonged', prolongation_count + 1
```

Триггер `track_ab_trial_conversion()` (trial_lesson_requests) остаётся без изменений — запись на пробное всегда первичная конверсия.

**SQL-миграция для self-hosted** (добавить в тот же файл):

- `ALTER TABLE persona_ab_assignments ADD COLUMN IF NOT EXISTS prolongation_count INTEGER DEFAULT 0;`

### Технические детали

- Проверка идёт по `online_payments.client_id` и `status = 'CONFIRMED'` (статус подтверждённого платежа Т-Банк)
- Текущий платёж (который вызвал триггер) ещё не записан в `online_payments` на момент срабатывания триггера на `clients`, так что count корректно отражает предыдущие платежи
- Для пролонгации: `UPDATE persona_ab_assignments SET conversion_event = 'prolonged', prolongation_count = prolongation_count + 1 WHERE client_id = ... AND converted = true`
- Для первичной: стандартная логика `SET converted = true, conversion_event = 'paid' WHERE converted = false`

