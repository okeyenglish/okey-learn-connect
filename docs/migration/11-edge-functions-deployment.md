# Деплой Edge Functions на Self-Hosted Supabase

Документация по развертыванию и управлению Edge Functions на self-hosted инстансе `api.academyos.ru`.

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Host (VPS)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │           supabase-edge-functions                    │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │  main/index.ts (Router)                      │    │    │
│  │  │  ├── EdgeRuntime.userWorkers.create()       │    │    │
│  │  │  └── Routes to sibling functions            │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
│  │  │ func-1   │ │ func-2   │ │ func-N   │            │    │
│  │  │ index.ts │ │ index.ts │ │ index.ts │            │    │
│  │  └──────────┘ └──────────┘ └──────────┘            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Требования

### Версии зависимостей

| Компонент | Версия | Причина |
|-----------|--------|---------|
| `@supabase/supabase-js` | `@2.75.1` (фиксированная) | Совместимость с edge-runtime v1.69.28 |
| Deno Edge Runtime | v1.69.28 | Стабильная версия для self-hosted |
| Docker | 20.10+ | Поддержка compose v2 |

### Критические ограничения

```typescript
// ✅ Правильно - фиксированная версия
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

// ❌ Неправильно - плавающая версия вызывает ошибки
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
```

## Структура проекта

```
supabase/
├── config.toml                 # Конфигурация проекта
├── functions/
│   ├── _shared/               # Общие утилиты
│   │   ├── types.ts           # Типы и хелперы
│   │   ├── cors.ts            # CORS утилиты
│   │   └── README.md          # Документация
│   ├── main/                  # Центральный роутер
│   │   └── index.ts
│   ├── telegram-webhook/      # Пример функции
│   │   └── index.ts
│   └── [other-functions]/
└── migrations/                # SQL миграции (не auto-apply)
```

## Стандартный шаблон Edge Function

```typescript
// supabase/functions/my-function/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { 
  successResponse, 
  errorResponse, 
  getErrorMessage,
  handleCors 
} from '../_shared/types.ts';

Deno.serve(async (req) => {
  // 1. CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // 2. Создание клиента
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Бизнес-логика
    const { data, error } = await supabase
      .from('my_table')
      .select('*');

    if (error) throw error;

    // 4. Успешный ответ
    return successResponse({ data });

  } catch (error: unknown) {
    console.error('[my-function] Error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
```

## Конфигурация config.toml

```toml
# supabase/config.toml
project_id = "kbojujfwtvmsgudumown"

# Публичные эндпоинты (webhooks) - без JWT
[functions.telegram-webhook]
verify_jwt = false

[functions.whatsapp-webhook]
verify_jwt = false

[functions.salebot-webhook]
verify_jwt = false

[functions.tbank-webhook]
verify_jwt = false

[functions.sitemap]
verify_jwt = false

# Защищенные эндпоинты - с JWT
[functions.chat-with-ai]
verify_jwt = false  # JWT проверяется в коде через getClaims()

[functions.telegram-send]
verify_jwt = false  # JWT проверяется в коде
```

## Деплой через GitHub Actions

### Workflow файл

```yaml
# .github/workflows/deploy-edge-functions-selfhosted.yml
name: Deploy Edge Functions (Self-Hosted)

on:
  push:
    branches: [main]
    paths:
      - 'supabase/functions/**'
      - 'supabase/migrations/**'
  workflow_dispatch:
    inputs:
      run_migrations:
        type: boolean
        default: true
      deploy_functions:
        type: boolean
        default: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          echo "${{ secrets.SSH_KNOWN_HOSTS }}" >> ~/.ssh/known_hosts

      - name: Deploy Functions
        if: ${{ inputs.deploy_functions != false }}
        run: |
          # Backup existing functions
          ssh ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }} \
            "cp -r /opt/supabase/functions /opt/supabase/functions.backup.$(date +%s)"
          
          # Sync new functions
          rsync -avz --delete \
            supabase/functions/ \
            ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }}:/opt/supabase/functions/
          
          # Restart edge runtime
          ssh ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }} \
            "cd /opt/supabase && docker compose restart functions"

      - name: Verify Deployment
        run: |
          sleep 10
          curl -f https://api.academyos.ru/functions/v1/edge-health-monitor || exit 1
```

### Необходимые секреты GitHub

| Секрет | Описание |
|--------|----------|
| `SSH_PRIVATE_KEY` | Приватный ключ для доступа к серверу |
| `SSH_KNOWN_HOSTS` | Fingerprint сервера |
| `SSH_USER` | Имя пользователя SSH |
| `SSH_HOST` | Хост сервера (api.academyos.ru) |

## Docker Compose конфигурация

```yaml
# docker-compose.yml (на сервере)
services:
  functions:
    image: supabase/edge-runtime:v1.69.28
    command:
      - start
      - --main-service
      - /home/deno/functions/main
    volumes:
      - ./functions:/home/deno/functions:ro
    environment:
      # Supabase
      - SUPABASE_URL=https://api.academyos.ru
      - SUPABASE_ANON_KEY=${ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
      
      # AI/OpenAI
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - LOVABLE_API_KEY=${LOVABLE_API_KEY}
      
      # Messengers
      - SALEBOT_API_KEY=${SALEBOT_API_KEY}
      - WAPPI_API_TOKEN=${WAPPI_API_TOKEN}
      - GREEN_API_ID_INSTANCE=${GREEN_API_ID_INSTANCE}
      - GREEN_API_TOKEN_INSTANCE=${GREEN_API_TOKEN_INSTANCE}
      
      # Payments
      - TBANK_TERMINAL_KEY=${TBANK_TERMINAL_KEY}
      - TBANK_PASSWORD=${TBANK_PASSWORD}
      
      # Push Notifications
      - VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
      - VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
      
      # SEO
      - YANDEX_OAUTH_TOKEN=${YANDEX_OAUTH_TOKEN}
      - YANDEX_DIRECT_TOKEN=${YANDEX_DIRECT_TOKEN}
      - GOOGLE_SERVICE_ACCOUNT=${GOOGLE_SERVICE_ACCOUNT}
      - INDEXNOW_KEY=${INDEXNOW_KEY}
    ports:
      - "54321:9000"
    restart: unless-stopped
```

## Ручной деплой

### 1. Подключение к серверу

```bash
ssh user@api.academyos.ru
cd /opt/supabase
```

### 2. Синхронизация функций

```bash
# С локальной машины
rsync -avz --delete \
  supabase/functions/ \
  user@api.academyos.ru:/opt/supabase/functions/
```

### 3. Перезапуск Edge Runtime

```bash
# На сервере
docker compose restart functions

# Проверка логов
docker compose logs -f functions --tail=100
```

### 4. Проверка работоспособности

```bash
# Health check
curl https://api.academyos.ru/functions/v1/edge-health-monitor

# Проверка конкретной функции
curl -X POST https://api.academyos.ru/functions/v1/telegram-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## Управление секретами

### Добавление секретов в Docker

```bash
# Редактирование .env файла на сервере
nano /opt/supabase/.env

# Добавить:
NEW_SECRET_KEY=your_secret_value

# Обновить docker-compose.yml
nano /opt/supabase/docker-compose.yml

# В секции environment добавить:
# - NEW_SECRET_KEY=${NEW_SECRET_KEY}

# Перезапуск
docker compose up -d functions
```

### Проверка доступности секрета

```typescript
// В Edge Function
const secretValue = Deno.env.get('NEW_SECRET_KEY');
if (!secretValue) {
  throw new Error('NEW_SECRET_KEY not configured');
}
```

## Отладка

### Просмотр логов

```bash
# Все логи
docker compose logs functions

# Последние 100 строк с follow
docker compose logs -f functions --tail=100

# Фильтр по функции
docker compose logs functions 2>&1 | grep "telegram-webhook"
```

### Проверка статуса контейнера

```bash
docker compose ps functions
docker stats supabase-functions
```

### Тестирование локально

```bash
# Запуск отдельной функции
cd supabase/functions
deno run --allow-net --allow-env telegram-webhook/index.ts
```

## Имена сервисов Docker Compose

> ⚠️ **Важно**: Имя **docker-compose сервиса** и **имя контейнера** — это разные вещи!

| Тип | Значение | Использование |
|-----|----------|---------------|
| **Service name** | `functions` | `docker compose restart functions` |
| **Container name** | `supabase-edge-functions` | `docker logs supabase-edge-functions` |

### Полный список сервисов

Вывод `docker compose config --services`:

| Сервис | Описание |
|--------|----------|
| `functions` | Edge Functions runtime |
| `db` | PostgreSQL база данных |
| `auth` | GoTrue authentication |
| `rest` | PostgREST API |
| `realtime` | Realtime subscriptions |
| `storage` | S3-compatible storage |
| `kong` | API Gateway |
| `studio` | Dashboard UI |
| `analytics` | Logflare analytics |
| `meta` | Metadata service |
| `supavisor` | Connection pooler |
| `vector` | Log aggregation |
| `imgproxy` | Image processing |
| `traefik` | Reverse proxy (optional) |

## Cheat Sheet команд

```bash
# Определите директорию проекта (измените под ваш сервер)
export SUPABASE_DIR=/home/automation/supabase-project
# Альтернатива: /opt/supabase

# Всегда начинайте с перехода в директорию проекта!
cd $SUPABASE_DIR

# Список всех сервисов
docker compose config --services

# Статус сервисов
docker compose ps

# Перезапуск Edge Functions
docker compose restart functions

# Логи Edge Functions (follow mode)
docker compose logs -f functions --tail=100

# Логи конкретной функции
docker compose logs functions 2>&1 | grep "salebot-webhook"

# Обновление из Git (если есть .git)
git pull origin main && docker compose restart functions
```

## Типичные ошибки и решения

### 1. `no such service: supabase-edge-functions`

**Причина**: Путаем имя контейнера (`supabase-edge-functions`) и имя compose-сервиса (`functions`)

```bash
# ❌ Неправильно
docker compose restart supabase-edge-functions

# ✅ Правильно
docker compose restart functions

# Проверить доступные сервисы
docker compose config --services
```

### 2. `no configuration file provided: not found`

**Причина**: Команда `docker compose ...` выполнена не из директории с `docker-compose.yml`

```bash
# ❌ Неправильно (запуск из ~)
cd ~
docker compose restart functions  # Ошибка!

# ✅ Правильно
cd /home/automation/supabase-project  # или ваш путь
docker compose restart functions
```

### 3. `fatal: not a git repository`

**Причина**: Команда `git pull` выполнена не из директории с `.git`

```bash
# ❌ Неправильно
cd ~
git pull origin main  # Ошибка!

# ✅ Правильно
cd /home/automation/supabase-project
git pull origin main
```

> **Примечание**: Если на сервере нет `.git` (деплой через rsync/GitHub Actions), то `git pull` не используется — файлы обновляются автоматически через CI/CD.

### 4. `detected dubious ownership in repository`

**Причина**: Git не доверяет директории (разные владельцы)

```bash
# Решение: добавить директорию в safe.directory
git config --global --add safe.directory /home/automation/supabase-project
```

### 5. InvalidWorkerResponse

**Причина**: Несовместимая версия `supabase-js`

```typescript
// ❌ Ошибка
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ✅ Решение
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
```

### 6. Failed to bootstrap runtime

**Причина**: Ошибка в deno.lock или зависимостях

```bash
# Решение: удалить lockfile
rm supabase/functions/deno.lock
docker compose restart functions
```

### 7. Function not found

**Причина**: Неправильная структура директорий

```bash
# Проверить структуру
ls -la /home/automation/supabase-project/functions/

# Должно быть:
# .../functions/main/index.ts
# .../functions/my-function/index.ts
```

### 8. CORS errors

**Причина**: Отсутствует обработка OPTIONS

```typescript
// ✅ Правильная обработка CORS
import { handleCors } from '../_shared/types.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  // ...
});
```

### 9. Environment variable undefined

**Причина**: Секрет не добавлен в docker-compose.yml

```yaml
# Проверить что переменная есть в environment:
environment:
  - MY_SECRET=${MY_SECRET}  # ← должно быть
```

## Мониторинг

### Cron-задачи (pg_cron)

```sql
-- Просмотр активных задач
SELECT * FROM cron.job;

-- Логи выполнения
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 20;
```

### Health endpoints

| Endpoint | Назначение |
|----------|------------|
| `/functions/v1/edge-health-monitor` | Общий health check |
| `/functions/v1/salebot-webhook` (GET) | Salebot status |
| `/functions/v1/telegram-webhook` (GET) | Telegram status |

## Чеклист деплоя

- [ ] Все функции используют `@supabase/supabase-js@2.75.1`
- [ ] Все функции используют `Deno.serve()` (не legacy `serve()`)
- [ ] CORS обработка через `handleCors()`
- [ ] Секреты добавлены в docker-compose.yml
- [ ] config.toml обновлен (verify_jwt)
- [ ] Функции протестированы локально
- [ ] Backup создан перед деплоем
- [ ] Health check пройден после деплоя

## Ссылки

- [Edge Runtime GitHub](https://github.com/supabase/edge-runtime)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Deploy](https://deno.com/deploy)
