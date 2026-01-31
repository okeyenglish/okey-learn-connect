# План исправления бесконечной "Загрузки данных"

## ✅ СТАТУС: РЕАЛИЗОВАНО

## Проблема

На главной странице CRM индикатор "Загрузка данных..." оставался бесконечно. Проблема была вызвана отсутствием таймаутов в RPC-вызовах.

## Решение

### ✅ Шаг 1: Добавлены таймауты к RPC в useChatThreadsInfinite

- Создана helper функция `rpcWithTimeout` с дефолтным таймаутом 8 секунд
- Применена к `get_chat_threads_paginated` и `get_unread_chat_threads`

### ✅ Шаг 2: Улучшена fallback логика

Реализована цепочка fallback:
1. `get_chat_threads_paginated` (8s timeout)
2. `get_chat_threads_fast` (5s timeout)  
3. Прямой SELECT из `clients` как последний resort

### ✅ Шаг 3: Добавлен retry конфиг

В `queryConfig.ts` добавлена конфигурация `threadsQueryConfig`:
- `retry: 2` - максимум 2 retry
- `retryDelay: 1000` - 1 секунда между retry

### ✅ Шаг 4: Улучшено логирование

Добавлены console.log для отслеживания начала запросов и fallback переключений.

## Изменённые файлы

1. `src/hooks/useChatThreadsInfinite.ts` - таймауты, fallback, логирование
2. `src/lib/queryConfig.ts` - новая конфигурация `threadsQueryConfig`

## Результат

| Сценарий | До | После |
|----------|-----|-------|
| RPC работает | Загрузка ~500ms | Без изменений |
| RPC зависает | Бесконечная загрузка | Таймаут 8s → fallback |
| RPC отсутствует | Ошибка, retry бесконечно | Fallback на прямой SQL |
| Сервер 500 | Бесконечные retry | 2 retry → показать список или пустой |
