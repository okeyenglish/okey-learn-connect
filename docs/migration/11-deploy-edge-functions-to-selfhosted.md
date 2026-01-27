# Деплой Edge Functions на Self-Hosted Supabase

> Этот документ описывает процесс развёртывания обновлённых Edge Functions на self-hosted Supabase инстанс (api.academyos.ru).

## Предпосылки

Edge Functions, которые вы видите в репозитории Lovable, **не синхронизируются автоматически** с self-hosted Supabase. После внесения изменений в Lovable необходимо вручную задеплоить функции.

## Требования

- Docker установлен и запущен
- SSH доступ к серверу api.academyos.ru
- Или: установленный Supabase CLI (для деплоя через CLI)

---

## Способ 1: Через GitHub Actions (рекомендуется)

В проекте уже настроен GitHub Actions workflow (`.github/workflows/deploy-edge-functions-selfhosted.yml`), который автоматически деплоит функции при push в main.

### Как это работает:
1. При push в `main` с изменениями в `supabase/functions/**`
2. Workflow подключается к серверу через SSH
3. Синхронизирует файлы через rsync
4. Перезапускает Edge Runtime контейнер

### Необходимые секреты GitHub:
```
SELFHOSTED_SSH_KEY       # Приватный SSH ключ
SELFHOSTED_SSH_HOST      # api.academyos.ru
SELFHOSTED_SSH_USER      # automation (или ваш пользователь)
SELFHOSTED_FUNCTIONS_PATH # /home/automation/supabase-project/volumes/functions
```

---

## Способ 2: Ручной деплой через SSH

### 1. Подключитесь к серверу:
```bash
ssh automation@api.academyos.ru
```

### 2. Перейдите в директорию функций:
```bash
cd /home/automation/supabase-project/volumes/functions
```

### 3. Скопируйте обновлённые файлы:

**Через rsync (с локальной машины):**
```bash
rsync -avz --delete \
  ./supabase/functions/ \
  automation@api.academyos.ru:/home/automation/supabase-project/volumes/functions/
```

**Или скачайте с GitHub:**
```bash
cd /home/automation/supabase-project
git pull origin main
cp -r ./supabase/functions/* ./volumes/functions/
```

### 4. Перезапустите Edge Runtime:
```bash
cd /home/automation/supabase-project
docker compose restart functions

# Проверьте логи
docker compose logs --tail 50 functions
```

---

## Способ 3: Через Supabase CLI (если настроено)

### 1. Установите Supabase CLI:
```bash
npm install -g supabase
```

### 2. Залогиньтесь:
```bash
supabase login
```

### 3. Линковка к проекту:
```bash
# Для self-hosted используйте параметры вашего инстанса
export SUPABASE_URL=https://api.academyos.ru
export SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### 4. Деплой функций:
```bash
supabase functions deploy telegram-webhook
supabase functions deploy wappi-whatsapp-webhook
supabase functions deploy max-webhook
supabase functions deploy salebot-webhook
supabase functions deploy onlinepbx-webhook
supabase functions deploy send-push-notification
```

---

## Список критических функций для Push-уведомлений

| Функция | Описание |
|---------|----------|
| `send-push-notification` | Центральный движок отправки push |
| `telegram-webhook` | Обработка входящих сообщений Telegram |
| `wappi-whatsapp-webhook` | Обработка входящих сообщений WhatsApp (Wappi) |
| `max-webhook` | Обработка входящих сообщений MAX (Telegram alt) |
| `salebot-webhook` | Обработка входящих сообщений Salebot |
| `onlinepbx-webhook` | Обработка входящих звонков OnlinePBX |

## Проверка работоспособности

### 1. Проверьте статус Edge Runtime:
```bash
docker compose ps functions
```

### 2. Проверьте логи:
```bash
docker compose logs --tail 100 functions | grep -i push
```

### 3. Отправьте тестовый запрос:
```bash
curl -X POST https://api.academyos.ru/functions/v1/send-push-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-anon-key>" \
  -d '{"userId":"test","payload":{"title":"Test","body":"Test message"}}'
```

### 4. Проверьте webhook_logs:
```sql
SELECT * FROM webhook_logs 
WHERE messenger_type = 'push-diagnostic' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Troubleshooting

### Функция не отвечает (timeout):
```bash
# Проверьте что контейнер запущен
docker compose ps

# Перезапустите
docker compose restart functions
```

### Ошибка "Missing VAPID keys":
```bash
# Проверьте переменные окружения в docker-compose.yml
grep -A5 'VAPID' docker-compose.yml

# Или в .env
cat .env | grep VAPID
```

### Push не доходит до пользователей:
1. Проверьте webhook_logs на наличие записей `push-diagnostic`
2. Убедитесь что `getOrgAdminManagerUserIds` возвращает пользователей
3. Проверьте что у пользователей есть записи в `push_subscriptions`

---

## Изменения в последнем обновлении

### v2.0 - Push Notifications Fix

**`_shared/types.ts`:**
- Исправлен `getOrgAdminManagerUserIds()` — теперь использует двухшаговый запрос для надёжности

**`send-push-notification/index.ts`:**
- Добавлена стратегия "свежая + fallback" для тест-пушей
- Улучшено логирование

**Webhook-функции:**
- Добавлено диагностическое логирование push-отправки
- Записи сохраняются в `webhook_logs` с типом `push-diagnostic`
