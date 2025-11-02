# Настройка Cron Job для OpenRouter Provisioner

## Метод 1: Через Supabase Dashboard (Рекомендуется)

1. Зайдите в Supabase Dashboard → SQL Editor
2. Выполните следующий SQL:

```sql
SELECT cron.schedule(
  'openrouter-provisioner-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kbojujfwtvmsgudumown.supabase.co/functions/v1/openrouter-provisioner',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtib2p1amZ3dHZtc2d1ZHVtb3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5MzksImV4cCI6MjA3Mzc3MDkzOX0.4SZggdlllMM8SYUo9yZKR-fR-nK4fIL4ZMciQW2EaNY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

## Метод 2: Через Supabase CLI

```bash
supabase functions schedule create \
  --project-ref kbojujfwtvmsgudumown \
  --name openrouter-provisioner-cron \
  --cron "* * * * *" \
  --endpoint /functions/v1/openrouter-provisioner
```

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
    url := 'https://kbojujfwtvmsgudumown.supabase.co/functions/v1/openrouter-provisioner',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtib2p1amZ3dHZtc2d1ZHVtb3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5MzksImV4cCI6MjA3Mzc3MDkzOX0.4SZggdlllMM8SYUo9yZKR-fR-nK4fIL4ZMciQW2EaNY"}'::jsonb,
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
