# AcademyOS CRM - Self-Hosted Migration Guide

> **Дата экспорта:** 2026-01-23  
> **Версия:** 1.0  
> **Источник:** Supabase Cloud → Self-Hosted Docker

## Обзор

Этот каталог содержит полную документацию структуры проекта для миграции на self-hosted Supabase.

## Содержание

| Файл | Описание |
|------|----------|
| [01-database-schema.sql](./01-database-schema.sql) | Полная схема БД (таблицы, типы, расширения) |
| [02-foreign-keys.md](./02-foreign-keys.md) | Все FK и зависимости между таблицами |
| [03-triggers-functions.sql](./03-triggers-functions.sql) | Триггеры и функции PostgreSQL |
| [04-edge-functions.md](./04-edge-functions.md) | 107 Edge Functions с описанием |
| [05-secrets.md](./05-secrets.md) | 34 секрета (без значений) |
| [06-storage-buckets.md](./06-storage-buckets.md) | Storage buckets и политики |
| [07-rls-policies.sql](./07-rls-policies.sql) | 205+ RLS политик |
| [08-restore-order.md](./08-restore-order.md) | Порядок восстановления |
| [09-problem-tables.sql](./09-problem-tables.sql) | 4 проблемные таблицы (готовый SQL) |
| [10-webhooks.md](./10-webhooks.md) | Внешние интеграции и webhook URLs |

## Критические зависимости

### Таблицы с FK на `auth.users` (восстанавливать ПОСЛЕ auth.users!)

1. `profiles` - основной профиль пользователя
2. `assistant_threads` - AI ассистент
3. `message_read_status` - статусы прочтения
4. `global_chat_read_status` - глобальные статусы чата
5. `pinned_modals` - закреплённые модалки
6. `audit_log` - аудит (changed_by)
7. `call_logs` - логи звонков (initiated_by)
8. `push_subscriptions` - push подписки

### Функции (создавать ДО триггеров!)

1. `update_updated_at_column()` - используется в 50+ таблицах
2. `has_role()` - используется в RLS политиках
3. `get_user_organization_id()` - используется в RLS

## Быстрый старт

```bash
# 1. Подготовка self-hosted окружения
docker-compose up -d

# 2. Создание расширений и базовых функций
psql -h localhost -U postgres -d postgres -f 01-database-schema.sql

# 3. Создание таблиц (без FK)
psql -h localhost -U postgres -d postgres -f 09-problem-tables.sql

# 4. Импорт auth.users (отдельно через Supabase)
# supabase db dump --schema auth ...

# 5. Импорт данных
# COPY commands или pg_restore

# 6. Добавление FK
psql -h localhost -U postgres -d postgres -c "ALTER TABLE ... ADD CONSTRAINT ..."

# 7. Создание триггеров и функций
psql -h localhost -U postgres -d postgres -f 03-triggers-functions.sql

# 8. RLS политики
psql -h localhost -U postgres -d postgres -f 07-rls-policies.sql

# 9. Деплой Edge Functions
supabase functions deploy
```

## Проблемные таблицы (14 ошибок)

При миграции возникли ошибки в 4 таблицах:

1. **assistant_threads** - FK на `auth.users(id)` через `owner_id`
2. **message_read_status** - FK на `auth.users(id)` и `chat_messages(id)`
3. **global_chat_read_status** - FK на `auth.users(id)` через `last_read_by`
4. **pinned_modals** - FK на `auth.users(id)` через `user_id`

**Решение:** См. файл `09-problem-tables.sql` - создание без FK, импорт данных, добавление FK.

## Секреты (обязательно настроить!)

После миграции необходимо настроить 34 секрета. См. файл `05-secrets.md`.

Критичные:
- `OPENAI_API_KEY` - для AI функций
- `VAPID_*` - для push уведомлений
- `GREEN_API_*` / `WPP_*` - для WhatsApp
- `SALEBOT_API_KEY` - для Salebot
- `TBANK_*` - для платежей

## Webhooks (обновить URLs!)

После миграции обновить webhook URLs во внешних сервисах:
- Telegram Bot
- WhatsApp (Green API, Wappi, WPP)
- Salebot
- T-Bank
- OnlinePBX

См. файл `10-webhooks.md`.
