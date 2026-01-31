
# Улучшение системы тегирования диалогов

## Обзор

Расширение текущей системы классификации диалогов для более глубокой аналитики и обучения AI. Добавляем новые измерения: **намерение клиента (intent)** и **проблема/возражение (issue)**.

## Текущее состояние vs Целевое

```text
ТЕКУЩАЯ СИСТЕМА                        ЦЕЛЕВАЯ СИСТЕМА
+----------------------+               +----------------------+
| scenario_type        |               | dialog_type          |
| client_type          |               | client_type          |
| client_stage         |               | client_stage (расш.) |
| outcome              |               | outcome              |
| quality_score        |     +         | quality_score        |
+----------------------+     |         | intent        [NEW]  |
                             |         | issue         [NEW]  |
                             |         | confidence    [NEW]  |
                             +-------> +----------------------+
```

## Новые поля и значения

### 1. intent (Намерение клиента)
| Код | Описание | Пример |
|-----|----------|--------|
| price_check | Узнать цену | "Сколько стоит?" |
| schedule_info | Узнать расписание | "Когда занятия?" |
| program_choice | Выбор программы | "Какой курс подойдет?" |
| comparison | Сравнение | "А чем вы лучше?" |
| hesitation | Сомнение | "Надо подумать" |
| urgent_start | Срочный старт | "Нужно срочно начать" |
| support_request | Запрос поддержки | "Есть вопрос по урокам" |
| upgrade_interest | Интерес к апгрейду | "А что после этого курса?" |

### 2. issue (Проблема/возражение)
| Код | Описание | Пример |
|-----|----------|--------|
| price_too_high | Дорого | "Это слишком дорого" |
| no_time | Нет времени | "Некогда водить" |
| child_motivation | Мотивация ребенка | "Ребенок не хочет" |
| teacher_issue | Проблема с педагогом | "Не нравится преподаватель" |
| technical_problem | Техническая проблема | "Не работает приложение" |
| missed_lessons | Пропуски занятий | "Часто болеем" |
| payment_problem | Проблема с оплатой | "Карта не проходит" |
| organization_complaint | Жалоба на организацию | "Неудобный филиал" |

### 3. Расширенный client_stage
| Код | Описание |
|-----|----------|
| lead | Первичный контакт |
| warm | Тёплый (интересуется) |
| ready_to_pay | Готов к оплате |
| active_student | Активный ученик |
| paused | На паузе |
| churned | Ушёл |
| returned | Вернувшийся |

## План реализации

### Шаг 1: Миграция БД (self-hosted)
Добавить новые колонки в таблицу `conversation_examples`:
- `intent TEXT` - намерение клиента
- `issue TEXT` - проблема/возражение (nullable)
- `confidence_score NUMERIC` - уверенность AI в классификации

### Шаг 2: Обновить Edge Function index-conversations
Расширить AI-промпт для извлечения новых полей:
- Добавить intent в анализ
- Добавить issue в анализ
- Добавить confidence_score

### Шаг 3: Создать справочник тегов
Новый файл `src/lib/dialogueTags.ts`:
- Все значения enum
- Русские метки
- Цвета для UI
- Описания для подсказок

### Шаг 4: Обновить компоненты библиотеки
- DialogueScriptCard: показывать intent и issue бейджи
- DialogueScriptDetail: полная информация
- SuccessfulDialoguesLibrary: фильтры по intent/issue
- ConversationSemanticSearch: использовать новые поля

### Шаг 5: Аналитическая панель
Расширить аналитику:
- Распределение по намерениям
- Частые проблемы
- Корреляция issue → outcome
- Слабые места менеджеров

## Структура файлов

```text
src/lib/
  dialogueTags.ts           [NEW] - Справочник всех тегов

supabase/functions/
  index-conversations/
    index.ts                [EDIT] - Расширенный промпт

src/components/admin/
  DialogueScriptCard.tsx    [EDIT] - Новые бейджи
  DialogueScriptDetail.tsx  [EDIT] - Полные теги
  SuccessfulDialoguesLibrary.tsx [EDIT] - Фильтры
  ConversationAnalyticsPanel.tsx [NEW] - Аналитика по тегам
```

## SQL миграция (self-hosted)

```sql
-- Добавить новые колонки
ALTER TABLE conversation_examples 
ADD COLUMN IF NOT EXISTS intent TEXT,
ADD COLUMN IF NOT EXISTS issue TEXT,
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC DEFAULT 0.8;

-- Создать индексы для фильтрации
CREATE INDEX IF NOT EXISTS idx_conv_examples_intent 
ON conversation_examples(intent) WHERE intent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conv_examples_issue 
ON conversation_examples(issue) WHERE issue IS NOT NULL;

-- Обновить существующие записи (заполнить NULL)
-- Можно переиндексировать через UI
```

## Обновленный AI-промпт

```text
Проанализируй диалог и определи:
- dialog_type: тип разговора
- client_stage: стадия клиента  
- intent: намерение клиента (что хочет узнать/получить)
- issue: проблема/возражение (если есть, иначе null)
- outcome: исход
- quality_score: оценка работы менеджера
- confidence_score: уверенность в классификации (0-1)
```

## Аналитические возможности после внедрения

1. **Где теряем клиентов**: issue=price_too_high + outcome=lost
2. **Какие намерения конвертируются лучше**: intent → conversion rate
3. **Слабые места менеджеров**: кто не закрывает возражения
4. **Обучение AI**: чёткие категории для RAG и рекомендаций

## Порядок выполнения

1. Создать `dialogueTags.ts` со справочником
2. Обновить `index-conversations` с новым промптом
3. Обновить UI компоненты для отображения тегов
4. Обновить фильтры в библиотеке
5. Создать панель аналитики по тегам
