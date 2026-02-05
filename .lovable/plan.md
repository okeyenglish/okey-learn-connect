

## Исправление Edge Functions на Self-Hosted Сервере

### Выявленные проблемы

| Функция | Ошибка | Причина |
|---------|--------|---------|
| `wpp-create` | `401 Invalid token` | Неверный или просроченный `WPP_SECRET` |
| `max-webhook` | `Identifier 'maxUserId' has already been declared` | Устаревший код на сервере с дублированием |
| `whatsapp-webhook` | `Identifier 'normalizePhone' has already been declared` | Устаревший код на сервере с дублированием |

### Анализ

**Текущий код в Lovable корректен** - дубликатов нет:
- `max-webhook`: одно объявление `extractPhoneFromChatId` (строка 785)
- `whatsapp-webhook`: одно объявление `normalizePhone` (строка 637)

**Проблема**: На сервере находятся старые версии файлов с дублирующимися объявлениями.

---

### План действий

#### 1. Синхронизация кода на self-hosted сервере

На сервере `api.academyos.ru` выполнить:

```bash
cd /home/automation/supabase-project

# Скачать актуальный код из репозитория
git pull origin main

# Синхронизировать Edge Functions
rsync -avz --delete ./supabase/functions/ ./volumes/functions/

# Перезапустить контейнер
docker compose restart functions

# Проверить логи
docker compose logs --tail=50 functions
```

#### 2. Проверка WPP_SECRET

Убедиться что переменная установлена в `.env` или `docker-compose.yml`:

```bash
# Проверить .env
grep WPP_SECRET .env

# Если отсутствует - добавить
echo 'WPP_SECRET=your_wpp_platform_secret' >> .env
```

Проверить что `docker-compose.yml` пробрасывает переменную в контейнер functions:

```yaml
functions:
  environment:
    - WPP_SECRET=${WPP_SECRET}
```

#### 3. Проверка работоспособности после деплоя

```bash
# Проверить статус функций
curl -s https://api.academyos.ru/functions/v1/edge-health-monitor

# Проверить отсутствие ошибок в логах
docker compose logs --tail=20 functions | grep -E "(error|Error|ERROR)"
```

---

### Техническое объяснение ошибок

**SyntaxError "Identifier has already been declared"** означает что в файле есть два объявления одной переменной/функции. Это происходит когда:

1. Файл редактировался вручную и случайно добавился дубликат
2. При merge-конфликте код не был правильно очищен
3. Старая версия файла содержит duplicate, новая - нет

Deno Edge Runtime проверяет синтаксис при загрузке функции. Если находит duplicate identifier - функция не запускается.

---

### Ожидаемый результат

После синхронизации:
- `wpp-create` начнёт аутентифицироваться (если `WPP_SECRET` валиден)
- `max-webhook` будет обрабатывать входящие MAX сообщения
- `whatsapp-webhook` будет обрабатывать входящие WhatsApp сообщения
- WPP интеграция заработает для отправки и приёма сообщений

