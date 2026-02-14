

# План оптимизации базы данных

## Проблема
База данных занимает ~29.5 ГБ. Основные потребители: `chat_messages` (517 МБ, из них 370 МБ — индексы), `webhook_logs`, `event_bus`, `cron.job_run_details`.

## Этап 1: Удаление дубликатов индексов chat_messages

Запуск готового скрипта из `docs/sql-optimizations/cleanup_duplicate_indexes.sql` на self-hosted сервере. Удаляет ~10 дублирующих индексов, освобождая ~100-150 МБ.

## Этап 2: Очистка старых логов (разовая)

SQL-скрипт для ручного выполнения на self-hosted сервере:

- `webhook_logs` старше 30 дней
- `event_bus` старше 30 дней  
- `cron.job_run_details` старше 7 дней
- `VACUUM FULL` для возврата места на диск

## Этап 3: Автоматическая ротация логов (Edge Function + pg_cron)

Создание edge function `db-maintenance`, которая будет:
- Удалять старые записи из `webhook_logs`, `event_bus`, `cron.job_run_details`
- Запускаться ежедневно через pg_cron (в 3:00 ночи)

## Этап 4: VACUUM ANALYZE

Запуск `VACUUM ANALYZE` на основных таблицах после очистки для обновления статистики и возврата дискового пространства.

---

## Техническая реализация

### Файлы

1. **Новый файл**: `supabase/functions/db-maintenance/index.ts`
   - Подключение через service_role key
   - Удаление старых записей из 3 таблиц
   - Логирование результатов
   - Защита по Authorization header

2. **Новый файл**: `docs/sql-optimizations/setup_db_maintenance_cron.sql`
   - SQL для настройки pg_cron задачи на self-hosted сервере

3. **Новый файл**: `docs/sql-optimizations/one_time_cleanup.sql`
   - Разовый скрипт очистки + VACUUM FULL

### Ожидаемый результат

- Освобождение 200-500 МБ сразу после очистки
- Предотвращение дальнейшего неконтролируемого роста логов
- Ускорение INSERT/UPDATE операций за счет меньшего числа индексов

