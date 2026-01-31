
# Улучшение системы тегирования диалогов

## Статус: ✅ РЕАЛИЗОВАНО

---

# Тренажёр скриптов для менеджеров

## Статус: ✅ РЕАЛИЗОВАНО

## Обзор

Система интерактивных тренировок для менеджеров на базе реальных успешных диалогов. AI играет роль клиента с разными возражениями.

## Реализованные компоненты

### 1. ScriptTrainerPage (`src/components/admin/ScriptTrainerPage.tsx`)
- Выбор сценариев тренировки по категориям
- Фильтры по сложности, типу диалога, намерению
- Быстрый старт с случайным сценарием
- Статистика тренировок (заготовка)

### 2. ScriptSimulator (`src/components/admin/ScriptSimulator.tsx`)
- Интерактивный чат с AI-клиентом
- Таймер и счётчик реплик
- Подсказки для менеджера
- Оценка и рекомендации по итогам

### 3. Edge Function `script-trainer-session`
- Генерация начального сообщения клиента
- Ответы клиента на реплики менеджера
- Оценка качества ответов менеджера
- Итоговая оценка сессии

## Сценарии тренировок

| ID | Название | Сложность | Возражение |
|----|----------|-----------|------------|
| price_objection | Работа с "Дорого" | Средне | price_too_high |
| no_time | "Нет времени" | Средне | no_time |
| child_motivation | Мотивация ребёнка | Сложно | child_motivation |
| first_contact | Первый контакт | Легко | — |
| program_choice | Выбор программы | Средне | — |
| competitor_comparison | Сравнение с конкурентами | Сложно | — |
| reactivation | Реактивация клиента | Сложно | — |
| urgent_start | Срочный старт | Легко | — |

## Доступ

Тренажёр доступен в админ-панели:  
**Обучение AI → вкладка "Тренажёр"**

---

## Обзор

Расширение текущей системы классификации диалогов для более глубокой аналитики и обучения AI. Добавлены новые измерения: **намерение клиента (intent)** и **проблема/возражение (issue)**.

## Реализованные изменения

### 1. Справочник тегов (`src/lib/dialogueTags.ts`)
- ✅ Централизованный словарь всех тегов
- ✅ Русские метки для UI
- ✅ Цветовые схемы для бейджей
- ✅ Описания для подсказок
- ✅ Хелперы `getLabel()` и `getColor()`

### 2. Edge Function `index-conversations`
- ✅ Расширенный AI-промпт для извлечения:
  - `intent` - намерение клиента
  - `issue` - проблема/возражение
  - `confidence_score` - уверенность классификации
  - `key_phrases` - лучшие фразы менеджера

### 3. Edge Function `get-successful-dialogues`
- ✅ Фильтрация по intent и issue
- ✅ Агрегация byIntent и byIssue
- ✅ Возврат новых полей в диалогах

### 4. Edge Function `conversation-analytics`
- ✅ Аналитика по намерениям
- ✅ Аналитика по возражениям
- ✅ Конверсия по intent
- ✅ Корреляция issue → lost

### 5. UI компоненты
- ✅ `DialogueScriptCard.tsx` - бейджи intent/issue с подсказками
- ✅ `DialogueScriptDetail.tsx` - полная информация, progress confidence
- ✅ `SuccessfulDialoguesLibrary.tsx` - фильтры по intent/issue
- ✅ `ConversationAnalyticsPanel.tsx` - панель аналитики по тегам

## SQL миграция (для self-hosted)

Выполните на вашем Supabase:

```sql
-- Добавить новые колонки
ALTER TABLE conversation_examples 
ADD COLUMN IF NOT EXISTS intent TEXT,
ADD COLUMN IF NOT EXISTS issue TEXT,
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC DEFAULT 0.8,
ADD COLUMN IF NOT EXISTS key_phrases TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS example_messages JSONB;

-- Создать индексы для фильтрации
CREATE INDEX IF NOT EXISTS idx_conv_examples_intent 
ON conversation_examples(intent) WHERE intent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conv_examples_issue 
ON conversation_examples(issue) WHERE issue IS NOT NULL;

-- Копировать messages в example_messages если нужно
UPDATE conversation_examples 
SET example_messages = messages 
WHERE example_messages IS NULL AND messages IS NOT NULL;
```

## Значения тегов

### intent (Намерение)
| Код | Описание |
|-----|----------|
| price_check | Узнать цену |
| schedule_info | Узнать расписание |
| program_choice | Выбор программы |
| comparison | Сравнение |
| hesitation | Сомнение |
| urgent_start | Срочный старт |
| support_request | Запрос поддержки |
| upgrade_interest | Интерес к апгрейду |

### issue (Возражение)
| Код | Описание |
|-----|----------|
| price_too_high | Дорого |
| no_time | Нет времени |
| child_motivation | Мотивация ребёнка |
| teacher_issue | Проблема с педагогом |
| technical_problem | Техническая проблема |
| missed_lessons | Пропуски занятий |
| payment_problem | Проблема с оплатой |
| organization_complaint | Жалоба на организацию |

## Следующие шаги

1. Выполнить SQL миграцию на self-hosted базе
2. Переиндексировать диалоги для заполнения новых полей
3. Использовать аналитику для выявления слабых мест
