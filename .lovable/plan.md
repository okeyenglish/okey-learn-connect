

# Исправление: импортированные клиенты перекрывают актуальные чаты

## Проблема
При первой загрузке CRM импортированные клиенты без реальных сообщений появляются выше актуальных чатов. После прокрутки (подгрузки следующих страниц) порядок нормализуется. Причины:

1. **RPC `get_chat_threads_paginated`** на self-hosted сервере возвращает клиентов без фильтрации по наличию сообщений -- импортированные клиенты попадают в первые страницы
2. **NaN в timestamp (строка 1164 CRM.tsx)** -- `new Date(null).getTime()` возвращает `NaN`, что ломает сортировку. Клиенты без `last_message_time` получают непредсказуемую позицию вместо конца списка
3. **`useClientIdsByPhoneSearch`** использует `.neq('status', 'deleted')` вместо `.eq('is_active', true)` -- фильтр не работает на self-hosted схеме
4. **Лимит поиска 50** -- при поиске старых клиентов результаты обрезаются

## Изменения

### 1. Файл: `src/pages/CRM.tsx` (строка 1164)
Исправить NaN -- добавить проверку на null для `last_message_time`:
```
// Было:
timestamp: new Date(thread.last_message_time).getTime()

// Стало:
timestamp: thread.last_message_time ? new Date(thread.last_message_time).getTime() : 0
```

### 2. Файл: `src/hooks/useChatThreadsInfinite.ts`
Добавить фильтр `.eq('is_active', true)` в `fetchThreadsDirectly` (строка 68), чтобы деактивированные дубликаты не загружались.

### 3. Файл: `src/hooks/useClientIdsByPhoneSearch.ts` (строка 25)
Заменить `.neq('status', 'deleted')` на `.eq('is_active', true)` -- чтобы фильтр работал на self-hosted схеме. Увеличить лимит с 50 до 200.

### 4. Файл: `src/hooks/useUnifiedSearch.ts` (строка 52)
Увеличить `p_limit` с 50 до 200, чтобы менеджеры могли находить старых клиентов.

### 5. SQL для self-hosted сервера
Рекомендация: обновить RPC `get_chat_threads_paginated` на сервере, добавив условие `WHERE c.last_message_at IS NOT NULL` -- это основная причина проблемы, т.к. RPC возвращает клиентов без сообщений в первых страницах пагинации.

