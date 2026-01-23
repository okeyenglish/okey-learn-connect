# OpenRouter Automatic Key Provisioning

Система автоматической выдачи персональных OpenRouter API ключей для каждой школы (организации) и каждого преподавателя через Provisioning API.

## 🎯 Преимущества

- **Независимые лимиты**: Каждая школа получает свои 200 запросов/день, каждый преподаватель — 50
- **Автоматизация**: Ключи создаются автоматически при регистрации
- **Надёжность**: Очередь с ретраями и exponential backoff
- **Безопасность**: Ключи хранятся только в service_role, недоступны клиентам напрямую
- **Масштабируемость**: Легко добавить 1000+ школ без ограничений

## 📋 Архитектура

```mermaid
graph TD
    A[Создание организации/преподавателя] --> B[Триггер добавляет задачу в очередь]
    B --> C[ai_key_provision_jobs]
    C --> D[Cron каждую минуту]
    D --> E[Edge Function: openrouter-provisioner]
    E --> F{Обработка задачи}
    F --> G[OpenRouter Provisioning API]
    G --> H[Сохранение ключа в ai_provider_keys]
    H --> I[Использование в chat-with-ai]
```

## 🗄️ Таблицы

### ai_provider_keys
Хранит выданные API ключи для организаций и преподавателей.

```sql
organization_id UUID  -- Ключ для организации (NULL для преподавателя)
teacher_id UUID       -- Ключ для преподавателя (NULL для организации)
provider TEXT         -- 'openrouter' | 'gateway'
key_value TEXT        -- Полный ключ (доступно только service_role)
key_preview TEXT      -- Маска: sk-or-abc...xyz
limit_monthly INT     -- Лимит запросов
limit_remaining INT   -- Остаток лимита
reset_policy TEXT     -- 'daily' | 'weekly' | 'monthly'
status TEXT           -- 'active' | 'disabled' | 'expired'
```

### ai_key_provision_jobs
Очередь задач на создание ключей.

```sql
organization_id UUID  -- ID организации (если для орг.)
teacher_id UUID       -- ID преподавателя (если для преп.)
entity_name TEXT      -- Название для лейбла ключа
provider TEXT         -- 'openrouter'
monthly_limit INT     -- Лимит запросов (200 для орг., 50 для препов)
reset_policy TEXT     -- 'daily'
status TEXT           -- 'queued' | 'running' | 'done' | 'failed' | 'retry'
attempts INT          -- Количество попыток
last_error TEXT       -- Последняя ошибка
run_after TIMESTAMP   -- Время следующего запуска
```

## ⚙️ Установка

### 1. Выполните миграцию

Миграция уже создана и применена. Проверьте таблицы:

```sql
SELECT * FROM ai_provider_keys;
SELECT * FROM ai_key_provision_jobs;
```

### 2. Добавьте секреты в Edge Functions

В self-hosted Supabase добавьте секреты:

```
OPENROUTER_PROVISIONING_KEY=sk-or-prov-xxxxxxxxxxxxx
SUPABASE_URL=https://api.academyos.ru
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OR_BATCH_SIZE=5
OR_DELAY_MS=1100
```

**Получить Provisioning Key:**
1. Зайдите на https://openrouter.ai/settings/keys
2. Создайте новый Provisioning Key
3. Скопируйте и сохраните в секретах

### 3. Задеплойте Edge Functions

```bash
# Deploy provisioner
supabase functions deploy openrouter-provisioner --no-verify-jwt

# Deploy chat function (uses keys)
supabase functions deploy chat-with-ai
```

### 4. Настройте Cron Job

Используйте SQL в self-hosted PostgreSQL:

```sql
SELECT cron.schedule(
  'openrouter-provisioner-every-minute',
  '* * * * *',  -- Каждую минуту
  $$
  SELECT net.http_post(
    url := 'https://api.academyos.ru/functions/v1/openrouter-provisioner',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ВСТАВЬТЕ_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

Проверьте статус:

```sql
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

## 🚀 Использование

### Автоматическое создание ключей

При создании новой организации или преподавателя ключи создаются автоматически:

```typescript
// Создание организации
const { data: org } = await supabase
  .from('organizations')
  .insert({ name: 'OKEY Lyubertsy' })
  .select()
  .single();

// Триггер автоматически создаст задачу в ai_key_provision_jobs
// В течение 1-2 минут ключ будет создан
```

### Ручная провизия ключа

Для существующих организаций/преподавателей:

```typescript
import { triggerKeyProvisioning } from '@/lib/aiProviderHelpers';

// Для организации
await triggerKeyProvisioning('organization', orgId, 'OKEY Moscow');

// Для преподавателя
await triggerKeyProvisioning('teacher', teacherId, 'John Smith');
```

### Использование AI с персональными ключами

Используйте Edge Function `chat-with-ai`:

```typescript
const response = await supabase.functions.invoke('chat-with-ai', {
  body: {
    messages: [
      { role: 'user', content: 'Hello!' }
    ],
    model: 'google/gemini-2.0-flash-exp:free'
  }
});

const { data, error } = response;
```

Функция автоматически:
1. Получит ключ организации (приоритет) или преподавателя
2. Проверит остаток лимита
3. Сделает запрос к OpenRouter
4. Вернёт результат

### Проверка статуса ключей

```typescript
import { hasActiveOpenRouterKey, getAIProviderKey } from '@/lib/aiProviderHelpers';

// Проверить наличие ключа
const hasKey = await hasActiveOpenRouterKey(organizationId);

// Получить информацию о ключе (без key_value)
const keyInfo = await getAIProviderKey();
console.log(keyInfo.keyPreview); // sk-or-abc...xyz
console.log(keyInfo.limitRemaining); // 187
```

## 📊 Мониторинг

### Статус очереди

```sql
SELECT 
  status,
  COUNT(*) as count,
  AVG(attempts) as avg_attempts
FROM ai_key_provision_jobs
GROUP BY status;
```

### Последние задачи

```sql
SELECT 
  id,
  entity_name,
  status,
  attempts,
  last_error,
  created_at,
  run_after
FROM ai_key_provision_jobs
ORDER BY created_at DESC
LIMIT 20;
```

### Выданные ключи

```sql
SELECT 
  key_preview,
  limit_monthly,
  limit_remaining,
  status,
  created_at,
  CASE 
    WHEN organization_id IS NOT NULL THEN 'Organization'
    WHEN teacher_id IS NOT NULL THEN 'Teacher'
  END as entity_type
FROM v_ai_provider_keys_public
ORDER BY created_at DESC;
```

### Лог cron-задач

```sql
SELECT 
  job_name,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE job_name = 'openrouter-provisioner-every-minute'
ORDER BY start_time DESC
LIMIT 10;
```

## 🔧 Тестирование

### Ручной запуск provisioner

```bash
curl -X POST https://api.academyos.ru/functions/v1/openrouter-provisioner \
  -H "Authorization: Bearer ВСТАВЬТЕ_ANON_KEY"
```

### Создать тестовую задачу

```sql
INSERT INTO ai_key_provision_jobs (
  organization_id,
  entity_name,
  provider,
  monthly_limit,
  reset_policy
) VALUES (
  (SELECT id FROM organizations LIMIT 1),
  'Test Organization',
  'openrouter',
  200,
  'daily'
);
```

### Тест chat-with-ai

```typescript
const { data, error } = await supabase.functions.invoke('chat-with-ai', {
  body: {
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Say "Hello World!"' }
    ]
  }
});

console.log(data.choices[0].message.content);
```

## 🛠️ Backfill существующих организаций

Для организаций и преподавателей, созданных до внедрения системы:

```sql
-- Создать задачи для всех организаций без ключей
INSERT INTO ai_key_provision_jobs (
  organization_id,
  entity_name,
  provider,
  monthly_limit,
  reset_policy
)
SELECT 
  o.id,
  o.name,
  'openrouter',
  200,
  'daily'
FROM organizations o
LEFT JOIN ai_provider_keys apk ON apk.organization_id = o.id
WHERE apk.id IS NULL;

-- Создать задачи для всех преподавателей без ключей
INSERT INTO ai_key_provision_jobs (
  teacher_id,
  entity_name,
  provider,
  monthly_limit,
  reset_policy
)
SELECT 
  t.id,
  t.name,
  'openrouter',
  50,
  'daily'
FROM teachers t
LEFT JOIN ai_provider_keys apk ON apk.teacher_id = t.id
WHERE apk.id IS NULL;
```

## 🚨 Решение проблем

### Ключи не создаются

1. Проверьте логи Edge Function:
```sql
SELECT * FROM edge_logs 
WHERE function_name = 'openrouter-provisioner' 
ORDER BY timestamp DESC LIMIT 10;
```

2. Проверьте статус задач:
```sql
SELECT * FROM ai_key_provision_jobs WHERE status = 'failed';
```

3. Проверьте секреты в Supabase Dashboard

### Rate Limit 429

OpenRouter ограничивает до 1 req/sec для Provisioning API. Функция автоматически делает паузу 1.1 сек между запросами. Если всё равно 429:

- Увеличьте `OR_DELAY_MS` до 1500-2000
- Уменьшите `OR_BATCH_SIZE` до 3

### Ключи создаются, но запросы не работают

1. Проверьте RLS политики:
```sql
SELECT * FROM ai_provider_keys WHERE organization_id = 'xxx';
```

2. Проверьте лимиты:
```sql
SELECT limit_remaining FROM ai_provider_keys 
WHERE status = 'active' AND limit_remaining > 0;
```

## 📈 Масштабирование

### Для большого количества школ

- Увеличьте `OR_BATCH_SIZE` до 10-20
- Настройте несколько Provisioning Keys и ротацию
- Добавьте мониторинг в Grafana/DataDog

### Управление лимитами

Повысить лимит через OpenRouter API:

```bash
curl -X PATCH https://openrouter.ai/api/v1/keys/sk-or-xxx \
  -H "Authorization: Bearer YOUR_PROVISIONING_KEY" \
  -d '{"limit": 500}'
```

Обновить в базе:

```sql
UPDATE ai_provider_keys 
SET limit_monthly = 500 
WHERE key_preview LIKE 'sk-or-xxx%';
```

## 🔐 Безопасность

- ✅ `key_value` доступен только service_role (RLS)
- ✅ Клиенты видят только маску через `v_ai_provider_keys_public`
- ✅ Все запросы к AI идут через Edge Function с проверкой auth
- ✅ Ключи уникальны для каждой организации/преподавателя
- ✅ Автоматическая деактивация при превышении лимита

## 📚 Дополнительно

- [OpenRouter Provisioning API Docs](https://openrouter.ai/docs/provisioning)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Cron Jobs](https://supabase.com/docs/guides/database/extensions/pg_cron)
