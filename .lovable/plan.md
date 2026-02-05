
## Диагностика WPP: отправка и приём сообщений

### Статус кода
Текущий код Edge-функций **корректен** и использует правильную схему для self-hosted базы:

| Поле | Значение |
|------|----------|
| `message_text` | текст сообщения |
| `is_outgoing` | boolean (true/false) |
| `message_type` | 'manager' / 'client' |
| `messenger_type` | 'whatsapp' |
| `message_status` | 'sent' / 'delivered' / 'failed' |
| `external_message_id` | taskId от WPP |

---

### Причина проблемы

**Функции Lovable Cloud и self-hosted не синхронизированы автоматически.**

При изменении Edge-функций в Lovable:
- Lovable Cloud — деплоятся автоматически
- Self-hosted (api.academyos.ru) — требуют **ручного деплоя**

---

### Действия для исправления

#### 1. Ручной деплой на self-hosted сервер

Подключиться к серверу и выполнить:

```bash
# Скопировать обновлённые функции
cp -r /путь/к/новым/функциям/* /home/automation/supabase-project/volumes/functions/

# Перезапустить контейнер
cd /home/automation/supabase-project
docker compose restart functions
```

Файлы для обновления:
- `supabase/functions/wpp-send/index.ts`
- `supabase/functions/wpp-webhook/index.ts`

#### 2. Проверка логов после деплоя

```bash
docker compose logs -f functions --tail=100
```

Искать:
- `[wpp-send] Sending to:` — отправка работает
- `[wpp-webhook] Processing message from:` — приём работает
- Ошибки типа `column ... does not exist` — схема не обновилась

#### 3. Проверка интеграции в БД

Убедиться, что WPP интеграция настроена:

```sql
SELECT id, name, provider, is_active, 
       settings->>'wppAccountNumber' as account,
       settings->>'wppApiKey' IS NOT NULL as has_key
FROM messenger_integrations
WHERE messenger_type = 'whatsapp' AND provider = 'wpp';
```

#### 4. Тест отправки сообщения

После деплоя — отправить тестовое сообщение через UI и проверить:
- Появилось ли сообщение в `chat_messages` с `messenger_type = 'whatsapp'`
- Есть ли ошибки в логах

---

### Техническая схема работы WPP

```text
┌──────────────────────────────────────────────────────────────┐
│                        ОТПРАВКА                               │
├──────────────────────────────────────────────────────────────┤
│  UI → selfHostedPost('wpp-send') → api.academyos.ru          │
│                           │                                   │
│                           ▼                                   │
│  wpp-send:  1. Auth check                                    │
│             2. Find integration (settings.wppAccountNumber)  │
│             3. WppMsgClient.sendText()                       │
│             4. INSERT chat_messages (is_outgoing=true)       │
│             5. Return { success, taskId }                    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                        ПРИЁМ                                  │
├──────────────────────────────────────────────────────────────┤
│  WPP Platform → POST /wpp-webhook?account=xxx                │
│                           │                                   │
│                           ▼                                   │
│  wpp-webhook: 1. Parse event type                            │
│               2. Find organization by account                │
│               3. Check teacher_id OR client_id               │
│               4. INSERT chat_messages (is_outgoing=false)    │
│               5. Update client.last_message_at               │
└──────────────────────────────────────────────────────────────┘
```

---

### Результат

После ручного деплоя на self-hosted:
- Отправка сообщений через WPP будет работать
- Входящие сообщения будут сохраняться в `chat_messages`
- Сообщения появятся в UI чата CRM

