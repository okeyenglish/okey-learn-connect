
# План исправления ошибок RPC

## Текущие ошибки (из network logs)

### 1. `get_family_data_by_client_id` (400)
**Ошибка**: `column ils.start_time does not exist`

**Причина**: Таблица `individual_lesson_sessions` на self-hosted использует `time_start` вместо `start_time`

**Исправлено**: Строки 188-199 — заменено `ils.start_time` → `ils.time_start`

### 2. `get_or_create_family_group_id` (404)
**Ошибка**: Function not found in schema cache

**Причина**: RPC не развёрнута на self-hosted базе

**Решение**: Выполнить SQL из `docs/rpc-get-or-create-family-group-id.sql`

### 3. `group_students` схема
**Исправлено**: `gs.left_at IS NULL` → `gs.status = 'active'`

## Файлы для применения на self-hosted

| Файл | Статус |
|------|--------|
| `docs/rpc-get-family-data-by-client-id.sql` | ✅ Обновлён |
| `docs/rpc-get-or-create-family-group-id.sql` | 📋 Нужно выполнить |

## После применения

После выполнения обновлённых SQL на self-hosted базе:
1. RPC `get_family_data_by_client_id` будет работать без ошибок 400
2. RPC `get_or_create_family_group_id` станет доступна
3. PostgREST schema cache обновится через NOTIFY
