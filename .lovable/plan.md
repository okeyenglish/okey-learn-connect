
# План: Обучение AI-бота на базе диалогов CRM

## Текущая архитектура

Уже реализовано:
- **pgvector** расширение для vector search
- **Таблица `docs`** с embeddings для сайта
- **Функция `match_docs`** для similarity search
- **Edge function `ask`** использует RAG для ответов

Текущая проблема `generate-gpt-response`:
- Берёт только **последние 10 сообщений текущего клиента**
- Не учится на успешных диалогах других менеджеров
- Стиль задан жёстко в промпте, а не извлекается из реальных данных

## Стратегия обучения

### Вариант 1: Fine-tuning (дорого, сложно)
- Требует много данных и вычислений
- Нужно платить за обучение модели
- Сложно обновлять при изменении стиля

### Вариант 2: RAG на диалогах (рекомендуется)
- Используем существующую инфраструктуру pgvector
- Индексируем успешные диалоги как примеры
- AI ищет похожие сценарии и адаптирует стиль
- Легко обновлять — просто добавлять новые примеры

## Архитектура решения

```text
┌─────────────────────────────────────────────────────────────┐
│                    База диалогов                             │
│  chat_messages (существующая таблица)                        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│            Новая таблица: conversation_examples              │
│  - id, scenario_type, client_type, context                   │
│  - messages (JSONB), outcome, tags                           │
│  - embedding (vector), quality_score                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│            Edge Function: index-conversations                │
│  1. Анализирует диалоги за период                            │
│  2. Определяет сценарий и тип клиента                        │
│  3. Создаёт embedding для поиска                             │
│  4. Сохраняет как пример                                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│       Улучшенный generate-gpt-response                       │
│  1. Определяет тип текущего клиента                          │
│  2. Ищет похожие диалоги через match_conversations           │
│  3. Использует найденные примеры как few-shot learning       │
│  4. Генерирует ответ в стиле лучших менеджеров               │
└─────────────────────────────────────────────────────────────┘
```

## Детальный план реализации

### Фаза 1: Создание структуры данных

**Новая таблица `conversation_examples`:**

```sql
CREATE TABLE conversation_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  
  -- Категоризация
  scenario_type TEXT NOT NULL, -- 'new_lead', 'returning', 'complaint', 'upsell', 'reactivation'
  client_type TEXT,            -- 'parent_child', 'adult', 'corporate', 'student'
  client_stage TEXT,           -- 'cold', 'warm', 'hot', 'active', 'churned'
  
  -- Контекст
  context_summary TEXT NOT NULL, -- Краткое описание ситуации
  initial_message TEXT,          -- С чего начался диалог
  
  -- Диалог
  messages JSONB NOT NULL,       -- [{role, content, timestamp}]
  total_messages INT,
  
  -- Результат и качество
  outcome TEXT,                  -- 'converted', 'scheduled', 'resolved', 'lost'
  quality_score INT DEFAULT 3,   -- 1-5, оценка качества ответа
  approved BOOLEAN DEFAULT FALSE, -- Одобрено для обучения
  
  -- Vector search
  embedding vector(1536),
  search_text TEXT,              -- Текст для создания embedding
  
  -- Метаданные
  source_client_id UUID,
  source_messages_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Индексы для поиска
CREATE INDEX idx_conv_examples_embedding ON conversation_examples 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

CREATE INDEX idx_conv_examples_scenario ON conversation_examples(scenario_type);
CREATE INDEX idx_conv_examples_client_type ON conversation_examples(client_type);
CREATE INDEX idx_conv_examples_approved ON conversation_examples(approved) WHERE approved = true;
```

**RPC функция для поиска похожих диалогов:**

```sql
CREATE FUNCTION match_conversations(
  query_embedding vector(1536),
  p_scenario_type TEXT DEFAULT NULL,
  p_client_type TEXT DEFAULT NULL,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  scenario_type TEXT,
  client_type TEXT,
  context_summary TEXT,
  messages JSONB,
  outcome TEXT,
  quality_score INT,
  similarity FLOAT
) AS $$
  SELECT 
    ce.id,
    ce.scenario_type,
    ce.client_type,
    ce.context_summary,
    ce.messages,
    ce.outcome,
    ce.quality_score,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM conversation_examples ce
  WHERE ce.approved = true
    AND (p_scenario_type IS NULL OR ce.scenario_type = p_scenario_type)
    AND (p_client_type IS NULL OR ce.client_type = p_client_type)
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql STABLE;
```

### Фаза 2: Edge Function для анализа и индексации диалогов

**Новый файл: `supabase/functions/index-conversations/index.ts`**

```typescript
// Анализирует диалоги и создаёт примеры для обучения
// Запускается периодически или вручную

async function analyzeConversation(messages: Message[]): Promise<ConversationAnalysis> {
  // 1. Определяем сценарий
  const scenarioPrompt = `Проанализируй диалог и определи:
  - scenario_type: new_lead | returning | complaint | upsell | reactivation | info_request
  - client_type: parent_child | adult | corporate | student
  - client_stage: cold | warm | hot | active | churned
  - outcome: converted | scheduled | resolved | lost | ongoing
  - quality_score: 1-5 (оценка качества работы менеджера)
  - context_summary: краткое описание ситуации (1-2 предложения)`;
  
  // 2. Создаём embedding из контекста + ключевых сообщений
  const searchText = `${analysis.scenario_type} ${analysis.client_type} ${analysis.context_summary}`;
  
  // 3. Сохраняем как пример
}
```

### Фаза 3: Улучшение generate-gpt-response

**Обновлённая логика:**

```typescript
// 1. Определяем контекст текущего клиента
const clientContext = await analyzeClientContext(clientId, currentMessage);
// Возвращает: scenario_type, client_type, client_stage

// 2. Создаём embedding для текущей ситуации
const contextEmbedding = await createEmbedding(
  `${clientContext.scenario_type} ${clientContext.client_type} ${currentMessage}`
);

// 3. Ищем похожие успешные диалоги
const similarExamples = await supabase.rpc('match_conversations', {
  query_embedding: contextEmbedding,
  p_scenario_type: clientContext.scenario_type,
  match_count: 3
});

// 4. Формируем промпт с примерами (few-shot learning)
const systemPrompt = `Ты менеджер O'KEY ENGLISH.

СТИЛЬ ОБЩЕНИЯ (основан на анализе ${similarExamples.length} успешных диалогов):
${buildStyleGuide(similarExamples)}

ПРИМЕРЫ ПОХОЖИХ СИТУАЦИЙ:
${similarExamples.map(ex => `
Ситуация: ${ex.context_summary}
Диалог: ${formatMessages(ex.messages)}
Результат: ${ex.outcome}
`).join('\n---\n')}

ТЕКУЩАЯ СИТУАЦИЯ:
Тип клиента: ${clientContext.client_type}
Стадия: ${clientContext.client_stage}
Сценарий: ${clientContext.scenario_type}

Сгенерируй ответ в стиле лучших менеджеров.`;
```

### Фаза 4: Интерфейс для курирования примеров

**Новый компонент админки:**

- Список диалогов с автоматической категоризацией
- Возможность одобрить/отклонить как пример
- Редактирование категорий и оценок
- Фильтры по сценариям и качеству

## Сценарии для обучения

| Сценарий | Описание | Примеры фраз |
|----------|----------|--------------|
| **new_lead** | Новый клиент, первое обращение | "Сколько стоит?", "Есть ли группы для ребёнка 5 лет?" |
| **returning** | Клиент возвращается после паузы | "Хотим продолжить обучение", "Прошло полгода, есть места?" |
| **complaint** | Жалоба или проблема | "Недоволен преподавателем", "Пропустили урок" |
| **upsell** | Продажа дополнительных услуг | "А есть ли интенсив?", "Можно добавить индивидуальные?" |
| **reactivation** | Возврат потерянного клиента | "Почему перестали ходить?", "Приглашаем обратно" |
| **info_request** | Запрос информации | "Какое расписание?", "Где находится филиал?" |

## Метрики качества

Для оценки эффективности:

1. **Conversion rate** — % диалогов, завершившихся записью
2. **Response quality** — ручная оценка 1-5
3. **Response time** — скорость ответа AI vs ручного
4. **Client satisfaction** — обратная связь

## Порядок реализации

1. **SQL миграция** — создать таблицу и RPC функции (1 день)
2. **index-conversations** — Edge function для анализа (2-3 дня)
3. **Улучшить generate-gpt-response** — интеграция RAG (1-2 дня)
4. **Админ-интерфейс** — курирование примеров (2-3 дня)
5. **Начальная индексация** — обработать существующие диалоги (1 день)
6. **Тестирование и настройка** (2-3 дня)

## Важные соображения

### Безопасность данных
- Примеры хранятся анонимизированно (без имён клиентов)
- Доступ только внутри организации
- Возможность удаления примеров с персональными данными

### Стоимость
- Embedding: ~$0.0001 за диалог (text-embedding-3-small)
- Анализ: ~$0.001 за диалог (GPT-4.1-mini)
- Хранение: минимальное (pgvector уже работает)

### Обновление
- Периодический запуск индексации (ежедневно/еженедельно)
- Автоматическое добавление одобренных диалогов
- Ротация старых примеров

## Альтернативный упрощённый вариант

Если нужно быстрее:

1. **Вручную выбрать 20-30 эталонных диалогов**
2. **Добавить их как few-shot примеры в промпт**
3. **Категоризировать по сценариям**
4. **Выбирать подходящие примеры на лету**

Это даст 80% результата за 20% времени, а полную систему можно развивать постепенно.
