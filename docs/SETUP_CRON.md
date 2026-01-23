# Настройка Cron Job для OpenRouter Provisioner

> **Self-Hosted:** Используется `api.academyos.ru`

## Метод 1: Через SQL (Рекомендуется)

1. Зайдите в Supabase Dashboard → SQL Editor или подключитесь к PostgreSQL
2. Выполните следующий SQL:

```sql
SELECT cron.schedule(
  'openrouter-provisioner-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://api.academyos.ru/functions/v1/openrouter-provisioner',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ВСТАВЬТЕ_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

**Важно:** Замените `ВСТАВЬТЕ_ANON_KEY` на актуальный anon key self-hosted инстанса.

## Проверка статуса

После создания cron job проверьте:

```sql
-- Список всех cron jobs
SELECT * FROM cron.job;

-- Последние запуски
SELECT 
  job_name,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

## Отключение cron job

Если нужно временно отключить:

```sql
SELECT cron.unschedule('openrouter-provisioner-every-minute');
```

## Изменение расписания

```sql
-- Удалить старый
SELECT cron.unschedule('openrouter-provisioner-every-minute');

-- Создать новый (например, каждые 2 минуты)
SELECT cron.schedule(
  'openrouter-provisioner-every-two-minutes',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://api.academyos.ru/functions/v1/openrouter-provisioner',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ВСТАВЬТЕ_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

## Формат расписания Cron

```
* * * * *
│ │ │ │ │
│ │ │ │ └─ День недели (0-7, где 0 и 7 = Воскресенье)
│ │ │ └─── Месяц (1-12)
│ │ └───── День месяца (1-31)
│ └─────── Час (0-23)
└───────── Минута (0-59)
```

Примеры:
- `* * * * *` - Каждую минуту
- `*/2 * * * *` - Каждые 2 минуты
- `*/5 * * * *` - Каждые 5 минут
- `0 * * * *` - Каждый час
- `0 0 * * *` - Каждый день в полночь

## Мониторинг

Создайте dashboard для мониторинга:

```sql
-- Статистика за последний час
SELECT 
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE status = 'succeeded') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as avg_duration_seconds
FROM cron.job_run_details
WHERE job_name = 'openrouter-provisioner-every-minute'
  AND start_time > NOW() - INTERVAL '1 hour';
```
```
