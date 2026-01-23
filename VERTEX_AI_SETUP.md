# Настройка Vertex AI для O'KEY English

## Текущая конфигурация

По умолчанию система использует **Lovable AI Gateway** с моделями Google Gemini. Это самый простой и быстрый способ начать работу.

## Переключение на прямой Vertex AI

Когда потребуется прямое подключение к Vertex AI (для контроля расходов, приватности данных, или увеличения лимитов), есть два способа:

### Способ 1: Через админку (рекомендуется)

1. Войдите в систему как администратор
2. Откройте Admin Panel (иконка меню в CRM)
3. Перейдите в раздел "AI Settings"
4. Выберите нужный провайдер:
   - **Lovable AI Gateway** - по умолчанию, быстрая настройка
   - **Vertex AI Direct** - прямое подключение к Google Cloud
5. Нажмите "Сохранить"

**Важно:** Для использования Vertex AI Direct необходимо сначала настроить секреты (см. Шаг 1-2 ниже).

### Способ 2: Через переменную окружения (приоритет выше)

Если установлена ENV переменная `AI_PROVIDER`, она имеет приоритет над настройкой в админке.

### Шаг 1: Настройка Google Cloud Platform

1. Создайте проект в [Google Cloud Console](https://console.cloud.google.com/)
2. Включите Vertex AI API:
   - Перейдите в "APIs & Services" → "Library"
   - Найдите "Vertex AI API" и включите его
3. Создайте сервисный аккаунт:
   - Перейдите в "IAM & Admin" → "Service Accounts"
   - Нажмите "Create Service Account"
   - Название: `vertex-ai-service`
   - Роли: `Vertex AI User`, `AI Platform Developer`
4. Создайте JSON ключ:
   - Выберите созданный сервисный аккаунт
   - Перейдите в "Keys" → "Add Key" → "Create new key"
   - Выберите тип JSON
   - Сохраните файл (он понадобится в следующем шаге)

### Шаг 2: Добавление секретов в Supabase

Секреты уже добавлены в систему, но нужно проверить их значения:

1. Откройте [Настройки Edge Functions](https://supabase.com/dashboard/project/kbojujfwtvmsgudumown/settings/functions)
2. Проверьте значения секретов:
   - `GCP_PROJECT_ID`: ID вашего GCP проекта (например: `my-project-123`)
   - `GCP_REGION`: Регион (рекомендуется: `us-central1`)
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON`: Содержимое JSON файла ключа (весь JSON как есть)

### Шаг 3: Переключение провайдера (через админку)

1. Войдите в систему как администратор
2. Откройте Admin Panel → AI Settings
3. Выберите "Vertex AI Direct"
4. Нажмите "Сохранить"

Система автоматически начнёт использовать Vertex AI для всех AI функций.

### Альтернативно: через ENV переменную

Если нужен приоритет ENV над настройкой в админке:

1. В Supabase перейдите в [Edge Functions Secrets](https://supabase.com/dashboard/project/kbojujfwtvmsgudumown/settings/functions)
2. Добавьте новый секрет:
   - Name: `AI_PROVIDER`
   - Value: `vertex`
3. Сохраните

**Важно:** После изменения `AI_PROVIDER` все AI функции автоматически начнут использовать Vertex AI вместо Lovable AI Gateway.

### Шаг 4: Тестирование

Используйте компонент `VertexAITester` для проверки работы:

```typescript
import { VertexAITester } from '@/components/developer/VertexAITester';

// В любом компоненте:
<VertexAITester />
```

Или вызовите напрямую edge function:

```bash
curl -X POST \
  https://api.academyos.ru/functions/v1/test-vertex-ai \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Привет! Как дела?",
    "test_type": "text",
    "provider": "vertex"
  }'
```

## Сравнение провайдеров

### Lovable AI Gateway (по умолчанию)

**Преимущества:**
- ✅ Быстрая настройка (уже работает)
- ✅ Единый API для всех моделей
- ✅ Не нужен Google Cloud аккаунт
- ✅ Встроенная интеграция с Lovable

**Недостатки:**
- ❌ Ограничения по квотам Lovable
- ❌ Меньше контроля над расходами

### Vertex AI (прямое подключение)

**Преимущества:**
- ✅ Полный контроль расходов
- ✅ Собственные квоты Google Cloud
- ✅ Data residency compliance
- ✅ Расширенные возможности (batch, fine-tuning)

**Недостатки:**
- ❌ Требует настройки GCP
- ❌ Более сложная конфигурация
- ❌ Нужен биллинг аккаунт в GCP

## Модели и функции

### Поддерживаемые модели Vertex AI:

**Текст и код:**
- `gemini-2.5-flash` - быстрая, экономичная (по умолчанию)
- `gemini-2.5-pro` - самая мощная
- `gemini-2.5-flash-lite` - самая быстрая и дешёвая

**Изображения:**
- `gemini-2.5-flash-image` - генерация изображений

**Эмбеддинги:**
- `text-embedding-004` - для векторного поиска

### Функции с AI:

1. **Генерация приложений:**
   - `generate-app` - создание HTML приложений
   - `improve-app` - улучшение приложений
   - `suggest-or-generate` - анализ и подготовка промптов

2. **CRM функции:**
   - `generate-gpt-response` - ответы клиентам
   - `generate-call-summary` - резюме звонков
   - `generate-delayed-gpt-response` - отложенные ответы

3. **Материалы:**
   - `generate-image` - генерация изображений
   - `teacher-assistant` - помощник преподавателя

## Стоимость (приблизительно)

### Lovable AI Gateway:
- Оплата через кредиты Lovable
- Включено бесплатное использование
- Лимиты зависят от плана

### Vertex AI (прямой):
- gemini-2.5-flash: ~$0.075 за 1M входных токенов
- gemini-2.5-flash-image: ~$0.04 за изображение
- text-embedding-004: ~$0.025 за 1M токенов

## Мониторинг

### Lovable AI Gateway:
- [Lovable Dashboard](https://lovable.app/dashboard)

### Vertex AI:
- [Google Cloud Console](https://console.cloud.google.com/vertex-ai)
- [Billing](https://console.cloud.google.com/billing)
- [Quotas](https://console.cloud.google.com/iam-admin/quotas)

## Отладка

### Логи Edge Functions:
- [test-vertex-ai логи](https://supabase.com/dashboard/project/kbojujfwtvmsgudumown/functions/test-vertex-ai/logs)
- [generate-app логи](https://supabase.com/dashboard/project/kbojujfwtvmsgudumown/functions/generate-app/logs)

### Типичные ошибки:

**"GCP_PROJECT_ID не настроен"**
- Добавьте секрет `GCP_PROJECT_ID` в Supabase

**"OAuth token error"**
- Проверьте корректность JSON ключа в `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- Убедитесь что сервисный аккаунт имеет нужные роли

**"Vertex AI error (403)"**
- Vertex AI API не включен в GCP проекте
- Сервисный аккаунт не имеет нужных permissions

## Рекомендации

1. **Начните с Lovable AI Gateway** - он уже настроен и работает
2. **Переходите на Vertex AI когда:**
   - Объёмы вырастут и нужен контроль расходов
   - Требуются комплаенс/приватность данные
   - Нужны расширенные возможности (batch jobs, fine-tuning)
3. **Тестируйте переключение** через `VertexAITester` перед production
4. **Мониторьте расходы** в Google Cloud Console
