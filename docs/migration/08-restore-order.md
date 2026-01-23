# Порядок восстановления

> Пошаговая инструкция для миграции на self-hosted Supabase

## Предварительные требования

1. ✅ Self-hosted Supabase запущен через docker-compose
2. ✅ PostgreSQL доступен (порт 5432 или кастомный)
3. ✅ Supabase CLI установлен
4. ✅ Доступ к облачному Supabase для экспорта

## Этап 1: Подготовка Self-Hosted

### 1.1 Запуск Supabase

```bash
cd supabase-docker
docker-compose up -d
```

### 1.2 Проверка подключения

```bash
psql -h localhost -U postgres -d postgres -c "SELECT version();"
```

## Этап 2: Экспорт данных из Cloud

### 2.1 Экспорт схемы (без данных)

```bash
# Полная схема
supabase db dump --db-url "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres" \
  --schema public \
  -f cloud-schema.sql

# Только auth схема
supabase db dump --db-url "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres" \
  --schema auth \
  -f cloud-auth-schema.sql
```

### 2.2 Экспорт данных

```bash
# Данные public схемы
supabase db dump --db-url "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres" \
  --schema public \
  --data-only \
  -f cloud-data.sql

# Данные auth.users
supabase db dump --db-url "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres" \
  --schema auth \
  --data-only \
  -f cloud-auth-data.sql
```

## Этап 3: Создание базовой структуры

### 3.1 Расширения

```sql
-- Выполнить на self-hosted
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";
```

### 3.2 Базовая функция update_updated_at_column

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3.3 Функция has_role (для RLS)

```sql
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = $1 AND ur.role = $2
  );
$$;
```

## Этап 4: Восстановление auth.users

⚠️ **КРИТИЧНО**: auth.users должны быть восстановлены ДО таблиц с FK на них!

```bash
# Импорт auth схемы
psql -h localhost -U postgres -d postgres -f cloud-auth-schema.sql

# Импорт auth данных
psql -h localhost -U postgres -d postgres -f cloud-auth-data.sql
```

**Проверка:**

```sql
SELECT count(*) FROM auth.users;
-- Должно совпадать с количеством в cloud
```

## Этап 5: Восстановление таблиц (без FK)

### 5.1 Создание таблиц без FK

Используйте файл `09-problem-tables.sql` для проблемных таблиц.

Для остальных таблиц:

```bash
# Импорт схемы (таблицы создадутся с FK)
psql -h localhost -U postgres -d postgres -f cloud-schema.sql
```

Если возникают ошибки FK:

```sql
-- Временно отключить FK
SET session_replication_role = 'replica';

-- Выполнить импорт
\i cloud-schema.sql

-- Включить FK обратно
SET session_replication_role = 'origin';
```

## Этап 6: Импорт данных

### 6.1 Порядок импорта данных

```sql
-- Отключить триггеры на время импорта
SET session_replication_role = 'replica';

-- Импорт данных
\i cloud-data.sql

-- Включить триггеры
SET session_replication_role = 'origin';
```

### 6.2 Альтернатива: COPY для больших таблиц

```sql
-- Экспорт в CSV (на cloud)
\COPY clients TO '/tmp/clients.csv' WITH CSV HEADER;

-- Импорт из CSV (на self-hosted)
\COPY clients FROM '/tmp/clients.csv' WITH CSV HEADER;
```

## Этап 7: Проблемные таблицы

Для 4 таблиц с ошибками используйте специальный скрипт:

```bash
psql -h localhost -U postgres -d postgres -f docs/migration/09-problem-tables.sql
```

## Этап 8: Добавление FK

После импорта данных добавить FK:

```sql
-- assistant_threads
ALTER TABLE public.assistant_threads 
ADD CONSTRAINT assistant_threads_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- message_read_status
ALTER TABLE public.message_read_status 
ADD CONSTRAINT fk_message_read_status_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.message_read_status 
ADD CONSTRAINT fk_message_read_status_message_id 
FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;

-- global_chat_read_status
ALTER TABLE public.global_chat_read_status 
ADD CONSTRAINT global_chat_read_status_last_read_by_fkey 
FOREIGN KEY (last_read_by) REFERENCES auth.users(id);

-- pinned_modals
ALTER TABLE public.pinned_modals 
ADD CONSTRAINT pinned_modals_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

## Этап 9: Триггеры и функции

```bash
psql -h localhost -U postgres -d postgres -f docs/migration/03-triggers-functions.sql
```

## Этап 10: RLS политики

```bash
psql -h localhost -U postgres -d postgres -f docs/migration/07-rls-policies.sql
```

## Этап 11: Storage

### 11.1 Создание buckets

```sql
\i docs/migration/06-storage-buckets.md
-- (Выполнить SQL секции из файла)
```

### 11.2 Миграция файлов

```bash
# Скачать файлы из cloud
supabase storage download avatars --linked --project-ref YOUR_PROJECT

# Загрузить в self-hosted
supabase storage upload avatars ./avatars --linked
```

## Этап 12: Edge Functions

### 12.1 Деплой функций

```bash
supabase functions deploy --project-ref YOUR_SELFHOSTED_PROJECT
```

### 12.2 Установка секретов

```bash
supabase secrets set OPENAI_API_KEY="sk-..."
supabase secrets set VAPID_PUBLIC_KEY="..."
# ... остальные секреты из 05-secrets.md
```

## Этап 13: Webhooks

Обновить webhook URLs во внешних сервисах:

| Сервис | Старый URL | Новый URL |
|--------|-----------|-----------|
| Telegram Bot | `https://OLD.supabase.co/functions/v1/telegram-webhook` | `https://NEW/functions/v1/telegram-webhook` |
| WhatsApp | ... | ... |
| Salebot | ... | ... |
| T-Bank | ... | ... |

## Этап 14: Проверка

### 14.1 Количество записей

```sql
-- Сравнить с cloud
SELECT 
  'clients' as table_name, count(*) FROM clients
UNION ALL
SELECT 'students', count(*) FROM students
UNION ALL
SELECT 'teachers', count(*) FROM teachers
UNION ALL
SELECT 'learning_groups', count(*) FROM learning_groups
UNION ALL
SELECT 'chat_messages', count(*) FROM chat_messages;
```

### 14.2 Целостность FK

```sql
-- Проверка orphaned records
SELECT count(*) FROM message_read_status 
WHERE user_id NOT IN (SELECT id FROM auth.users);
-- Должно быть 0
```

### 14.3 Работа триггеров

```sql
-- Обновить запись и проверить updated_at
UPDATE clients SET first_name = first_name WHERE id = (SELECT id FROM clients LIMIT 1);
SELECT updated_at FROM clients WHERE id = (SELECT id FROM clients LIMIT 1);
```

### 14.4 RLS

```sql
-- Проверить что RLS включен
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
```

## Troubleshooting

### Ошибка: "relation auth.users does not exist"

```bash
# Проверить что auth схема создана
psql -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'auth';"
```

### Ошибка: "foreign key constraint violated"

```sql
-- Найти проблемные записи
SELECT * FROM assistant_threads 
WHERE owner_id NOT IN (SELECT id FROM auth.users);

-- Удалить orphaned записи
DELETE FROM assistant_threads 
WHERE owner_id NOT IN (SELECT id FROM auth.users);
```

### Ошибка: "function does not exist"

```sql
-- Создать недостающую функцию
\i docs/migration/03-triggers-functions.sql
```
