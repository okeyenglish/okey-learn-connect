# App Store Deployment Guide

Руководство по развёртыванию системы генерации EFL mini-приложений для OKey English CRM.

## 📋 Содержание

- [Предварительные требования](#предварительные-требования)
- [Получение учётных данных](#получение-учётных-данных)
- [Локальный деплой](#локальный-деплой)
- [Деплой через Lovable](#деплой-через-lovable)
- [Деплой через CI/CD](#деплой-через-cicd)
- [Проверка работоспособности](#проверка-работоспособности)
- [Откат изменений](#откат-изменений)
- [Troubleshooting](#troubleshooting)

---

## Предварительные требования

### Инструменты

- **PostgreSQL Client** (`psql`) — для применения миграций
- **Supabase CLI** (v2+) — для управления Edge Functions и секретами
- **OpenAI API Key** — для генерации приложений через GPT-4o

Установка Supabase CLI:

```bash
npm install -g supabase
# или
brew install supabase/tap/supabase
```

### Доступы

- Доступ к Supabase проекту с правами администратора
- Права на создание таблиц, функций, Storage buckets
- Права на управление Edge Functions и секретами

---

## Получение учётных данных

### 1. SUPABASE_PROJECT_REF

Это короткий идентификатор проекта в Supabase.

**Как получить:**
1. Открыть [Supabase Dashboard](https://supabase.com/dashboard)
2. Выбрать проект **OKey English CRM**
3. Скопировать **Project ref** из URL или Settings → General

**Пример:** `kbojujfwtvmsgudumown`

### 2. SUPABASE_DB_URL

Строка подключения к базе данных PostgreSQL с **service_role** правами.

**Как получить:**
1. Открыть [Project Settings → Database](https://supabase.com/dashboard/project/kbojujfwtvmsgudumown/settings/database)
2. Найти раздел **Connection string** → **URI**
3. Выбрать режим **Session** (не Transaction)
4. Заменить `[YOUR-PASSWORD]` на реальный пароль базы данных

**Формат:**
```
postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

**Пример:**
```
postgresql://postgres.kbojujfwtvmsgudumown:MySecurePassword@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

⚠️ **Важно:** Используйте пароль **postgres** пользователя, не **service_role** ключ!

### 3. SUPABASE_ACCESS_TOKEN

Personal Access Token для Supabase CLI.

**Как получить:**
1. Открыть [Account Settings → Access Tokens](https://supabase.com/dashboard/account/tokens)
2. Нажать **Generate new token**
3. Дать имя: `CI/CD Deployment`
4. Скопировать токен (начинается с `sbp_...`)

**Пример:** `sbp_1234567890abcdef1234567890abcdef`

### 4. OPENAI_API_KEY

API ключ OpenAI для работы GPT-4o.

**Как получить:**
1. Открыть [OpenAI Platform](https://platform.openai.com/api-keys)
2. Войти в аккаунт
3. Создать новый API ключ: **Create new secret key**
4. Скопировать ключ (начинается с `sk-...`)

**Пример:** `sk-proj-1234567890abcdefghijklmnopqrstuvwxyz`

⚠️ **Важно:** Ключ должен иметь доступ к модели **gpt-4o** (не gpt-3.5-turbo).

### 5. SUPABASE_URL и SUPABASE_ANON_KEY

Нужны для smoke-тестов.

**Как получить:**
1. Открыть [Project Settings → API](https://supabase.com/dashboard/project/kbojujfwtvmsgudumown/settings/api)
2. Скопировать:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** ключ → `SUPABASE_ANON_KEY`

**Примеры:**
```
SUPABASE_URL=https://kbojujfwtvmsgudumown.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Локальный деплой

### Шаг 1: Настроить переменные окружения

Создать файл `.env.deployment` в корне проекта:

```bash
# Supabase Project
export SUPABASE_PROJECT_REF="kbojujfwtvmsgudumown"
export SUPABASE_DB_URL="postgresql://postgres.PROJECT_REF:PASSWORD@HOST:PORT/postgres"
export SUPABASE_ACCESS_TOKEN="sbp_your_token"
export SUPABASE_URL="https://kbojujfwtvmsgudumown.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGciOi..."

# OpenAI
export OPENAI_API_KEY="sk-proj-your_key"
```

Загрузить переменные:

```bash
source .env.deployment
```

### Шаг 2: Дать права на выполнение скрипта

```bash
chmod +x scripts/bootstrap_app_store.sh
```

### Шаг 3: Запустить скрипт

```bash
./scripts/bootstrap_app_store.sh
```

Скрипт выполнит:
1. ✅ Проверку инструментов (psql, supabase CLI)
2. ✅ Проверку переменных окружения
3. ✅ Применение миграции БД
4. ✅ Настройку Storage bucket `apps`
5. ✅ Установку секретов Edge Functions
6. ✅ Smoke-тест всех компонентов
7. ✅ Опциональный деплой Edge Functions

### Шаг 4: Проверить результат

```bash
# Проверить таблицы
psql "$SUPABASE_DB_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'app%';"

# Проверить Storage bucket
psql "$SUPABASE_DB_URL" -c "SELECT id, name, public FROM storage.buckets WHERE id='apps';"

# Проверить Edge Functions секреты
supabase secrets list --project-ref "$SUPABASE_PROJECT_REF"
```

---

## Деплой через Lovable

Для деплоя в Lovable Preview окружении:

### Шаг 1: Применить миграцию вручную

1. Открыть [Supabase SQL Editor](https://supabase.com/dashboard/project/kbojujfwtvmsgudumown/sql/new)
2. Скопировать содержимое файла `supabase/migrations/20250131000000_create_apps_store.sql`
3. Вставить в SQL Editor
4. Нажать **Run**
5. Дождаться успешного выполнения (зелёная галочка)

### Шаг 2: Применить Storage конфигурацию

1. В том же [SQL Editor](https://supabase.com/dashboard/project/kbojujfwtvmsgudumown/sql/new)
2. Скопировать содержимое файла `supabase/storage/apps_bucket.sql`
3. Вставить и выполнить
4. Проверить создание bucket в [Storage](https://supabase.com/dashboard/project/kbojujfwtvmsgudumown/storage/buckets)

### Шаг 3: Настроить секреты через Lovable UI

В Lovable:
1. Открыть **Settings** → **Edge Functions Secrets**
2. Добавить секрет:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** `sk-proj-your_key`
3. Сохранить

### Шаг 4: Деплой Edge Functions

Edge Functions автоматически деплоятся при изменении кода в Lovable.

Если нужен ручной деплой:
```bash
supabase functions deploy generate-app --project-ref kbojujfwtvmsgudumown
supabase functions deploy suggest-or-generate --project-ref kbojujfwtvmsgudumown
supabase functions deploy improve-app --project-ref kbojujfwtvmsgudumown
```

---

## Деплой через CI/CD

### Настройка GitHub Actions

#### Шаг 1: Добавить секреты в GitHub

1. Открыть репозиторий → **Settings** → **Secrets and variables** → **Actions**
2. Нажать **New repository secret**
3. Добавить следующие секреты:

| Name | Value | Описание |
|------|-------|----------|
| `SUPABASE_PROJECT_REF` | `kbojujfwtvmsgudumown` | Project ref |
| `SUPABASE_DB_URL` | `postgresql://postgres...` | Строка подключения |
| `SUPABASE_ACCESS_TOKEN` | `sbp_...` | CLI токен |
| `SUPABASE_URL` | `https://...supabase.co` | Project URL |
| `SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Anon ключ |
| `OPENAI_API_KEY` | `sk-proj-...` | OpenAI ключ |

#### Шаг 2: Включить GitHub Actions

Файл `.github/workflows/deploy-supabase.yml` уже создан в проекте.

Workflow запускается автоматически при:
- Push в `main` ветку
- Изменениях в `supabase/` директории
- Ручном запуске через GitHub UI

#### Шаг 3: Запустить деплой

**Автоматически:**
```bash
git add .
git commit -m "Deploy app store infrastructure"
git push origin main
```

**Вручную:**
1. Открыть репозиторий → **Actions**
2. Выбрать **Deploy Supabase Infrastructure**
3. Нажать **Run workflow** → **Run workflow**

#### Шаг 4: Проверить результат

В GitHub Actions будет показан статус каждого шага:
- ✅ Database migration applied
- ✅ Storage bucket configured
- ✅ Edge Functions secrets set
- ✅ Edge Functions deployed
- ✅ Smoke tests passed

---

## Проверка работоспособности

### 1. Проверка базы данных

```sql
-- Проверить таблицы
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' AND table_name IN (
  'apps', 'app_versions', 'app_installs', 
  'app_reviews', 'app_usage', 'app_flags'
);

-- Проверить VIEW
SELECT * FROM catalog LIMIT 1;

-- Проверить функции
SELECT proname FROM pg_proc 
WHERE proname IN (
  'set_updated_at', 'app_fingerprint', 
  'set_app_fingerprint', 'similar_apps'
);

-- Проверить RLS
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname='public' AND tablename LIKE 'app%';
```

### 2. Проверка Storage

```sql
-- Проверить bucket
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets WHERE id='apps';

-- Проверить политики
SELECT policyname FROM pg_policies 
WHERE schemaname='storage' AND tablename='objects' 
AND policyname LIKE '%apps%';
```

### 3. Проверка Edge Functions

```bash
# Проверить список функций
supabase functions list --project-ref kbojujfwtvmsgudumown

# Проверить логи
supabase functions logs generate-app --project-ref kbojujfwtvmsgudumown
```

Или через Dashboard:
- [generate-app logs](https://supabase.com/dashboard/project/kbojujfwtvmsgudumown/functions/generate-app/logs)
- [improve-app logs](https://supabase.com/dashboard/project/kbojujfwtvmsgudumown/functions/improve-app/logs)
- [suggest-or-generate logs](https://supabase.com/dashboard/project/kbojujfwtvmsgudumown/functions/suggest-or-generate/logs)

### 4. E2E тест через UI

1. Открыть приложение → **AI Hub** → **Генератор приложений**
2. Ввести запрос: *"Игра для практики неправильных глаголов (A2)"*
3. AI должен предложить создание
4. Нажать **"Создать приложение"**
5. Дождаться генерации (~30-60 секунд)
6. Проверить:
   - ✅ Приложение появилось в списке
   - ✅ Preview URL открывается
   - ✅ Кнопки улучшения работают

---

## Откат изменений

Если что-то пошло не так, можно откатить изменения:

### Откат миграции

```sql
-- Удалить таблицы
DROP TABLE IF EXISTS app_flags CASCADE;
DROP TABLE IF EXISTS app_usage CASCADE;
DROP TABLE IF EXISTS app_reviews CASCADE;
DROP TABLE IF EXISTS app_installs CASCADE;
DROP TABLE IF EXISTS app_versions CASCADE;
DROP TABLE IF EXISTS apps CASCADE;

-- Удалить функции
DROP FUNCTION IF EXISTS similar_apps(vector, float, int);
DROP FUNCTION IF EXISTS set_app_fingerprint();
DROP FUNCTION IF EXISTS app_fingerprint(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS set_updated_at();

-- Удалить VIEW
DROP VIEW IF EXISTS catalog;
```

### Откат Storage

```sql
-- Удалить bucket (удалит все файлы!)
DELETE FROM storage.objects WHERE bucket_id = 'apps';
DELETE FROM storage.buckets WHERE id = 'apps';
```

### Откат секретов

```bash
supabase secrets unset OPENAI_API_KEY --project-ref kbojujfwtvmsgudumown
```

---

## Troubleshooting

### Ошибка: "relation does not exist"

**Причина:** Миграция не применена или применена частично.

**Решение:**
```bash
# Проверить наличие таблиц
psql "$SUPABASE_DB_URL" -c "\dt apps*"

# Если пусто — применить миграцию заново
psql "$SUPABASE_DB_URL" -f supabase/migrations/20250131000000_create_apps_store.sql
```

### Ошибка: "OPENAI_API_KEY is not configured"

**Причина:** Секрет не установлен в Edge Functions.

**Решение:**
```bash
# Проверить секреты
supabase secrets list --project-ref kbojujfwtvmsgudumown

# Установить секрет
supabase secrets set OPENAI_API_KEY="sk-proj-..." --project-ref kbojujfwtvmsgudumown
```

### Ошибка: "Failed to upload to storage"

**Причина:** Storage bucket не создан или недоступен.

**Решение:**
```sql
-- Проверить bucket
SELECT * FROM storage.buckets WHERE id='apps';

-- Если пусто — создать
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('apps', 'apps', true, 10485760, ARRAY['text/html']);
```

### Ошибка: "permission denied for schema"

**Причина:** Недостаточно прав у пользователя БД.

**Решение:**
- Убедитесь, что используете **postgres** пользователя, не anon
- Проверьте формат `SUPABASE_DB_URL` — должен содержать `postgres:PASSWORD@...`
- Не используйте Supabase anon/service_role ключи вместо пароля БД

### Ошибка: "ivfflat index requires pgvector"

**Причина:** Расширение `pgvector` не установлено.

**Решение:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Edge Function не отвечает

**Причина:** Функция не задеплоена или есть ошибка в коде.

**Решение:**
1. Проверить логи: [Functions → generate-app → Logs](https://supabase.com/dashboard/project/kbojujfwtvmsgudumown/functions/generate-app/logs)
2. Задеплоить заново:
   ```bash
   supabase functions deploy generate-app --project-ref kbojujfwtvmsgudumown
   ```
3. Проверить сетевые запросы в браузере (DevTools → Network)

---

## Полезные ссылки

- [Supabase SQL Editor](https://supabase.com/dashboard/project/kbojujfwtvmsgudumown/sql/new)
- [Storage Buckets](https://supabase.com/dashboard/project/kbojujfwtvmsgudumown/storage/buckets)
- [Edge Functions](https://supabase.com/dashboard/project/kbojujfwtvmsgudumown/functions)
- [Edge Functions Secrets](https://supabase.com/dashboard/project/kbojujfwtvmsgudumown/settings/functions)
- [Database Settings](https://supabase.com/dashboard/project/kbojujfwtvmsgudumown/settings/database)
- [API Settings](https://supabase.com/dashboard/project/kbojujfwtvmsgudumown/settings/api)

---

## Контакты

При возникновении проблем обращайтесь:
- **Техническая поддержка:** DevOps команда
- **Документация Supabase:** https://supabase.com/docs
- **OpenAI API Help:** https://platform.openai.com/docs

---

**Версия документа:** 1.0  
**Дата обновления:** 31 января 2025  
**Автор:** OKey English DevOps Team
