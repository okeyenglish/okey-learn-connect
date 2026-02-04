

## План: Синхронизация схемы БД для messenger_integrations

### Диагностика

Подтверждено несоответствие схемы:
- **Self-hosted БД**: использует колонку `is_enabled`
- **Код Edge Functions**: использует колонку `is_active`

### Решение

Добавить колонку `is_active` в self-hosted БД и синхронизировать данные из `is_enabled`.

### SQL миграция для self-hosted

Выполни на сервере:

```bash
docker exec -it supabase-db psql -U postgres -d postgres -c "
-- Добавить колонку is_active
ALTER TABLE messenger_integrations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Синхронизировать значения из is_enabled
UPDATE messenger_integrations SET is_active = is_enabled WHERE is_active IS NULL;
"
```

### Проверка после миграции

```bash
# Проверить что колонка добавлена
docker exec -it supabase-db psql -U postgres -d postgres -c "SELECT id, name, is_enabled, is_active FROM messenger_integrations;"
```

### Изменения в коде

Изменения в коде **не требуются** - код уже использует `is_active`, нужно только обновить схему БД.

### Порядок выполнения

1. Выполнить SQL миграцию на self-hosted
2. Проверить что колонка добавлена
3. Протестировать подключение WhatsApp через UI

