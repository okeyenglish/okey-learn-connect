
# Серверная фильтрация чатов по филиалам менеджера

## Проблема

Сейчас `get_chat_threads_paginated` загружает 50 последних чатов **глобально**, а фильтрация по филиалу менеджера (`canAccessBranch`) происходит на клиенте (строки 1293-1301 в CRM.tsx). Если у менеджера открыты филиалы "Мытищи" и "Котельники", но среди глобальных топ-50 чатов только 5 из этих филиалов -- он видит лишь 5 чатов.

Нужно передавать список разрешенных филиалов менеджера на уровень SQL, чтобы пагинация возвращала 50 чатов **из его филиалов**.

## Решение

### 1. Обновить RPC `get_chat_threads_paginated`

Добавить параметр `p_branches TEXT[] DEFAULT NULL` (массив названий филиалов).

Когда массив передан и не пуст, добавляется условие:
```text
WHERE ...
  AND (p_branches IS NULL OR branch IS NULL OR branch = ANY(p_branches))
```

Клиенты с `branch = NULL` (нераспределённые) продолжают показываться всем -- это текущая политика "fail-open".

### 2. Аналогичное обновление для `get_unread_chat_threads`

Добавить `p_branches TEXT[] DEFAULT NULL` с тем же условием.

### 3. Изменения в `useChatThreadsInfinite.ts`

- Принять `allowedBranches?: string[]` как параметр хука
- Добавить в `queryKey`: `['chat-threads-infinite', allowedBranches || 'all']`
- Передавать `p_branches` в RPC:
  ```
  .rpc('get_chat_threads_paginated', {
    p_limit: PAGE_SIZE + 1,
    p_offset: pageParam * PAGE_SIZE,
    p_branches: allowedBranches?.length ? allowedBranches : null
  })
  ```
- Обновить `fetchThreadsDirectly`: при наличии `allowedBranches` добавить `.in('branch', allowedBranches)` с дополнительным `.or('branch.is.null')` для fail-open
- Аналогично для `get_unread_chat_threads`

### 4. Изменения в `CRM.tsx`

- Из `useManagerBranches()` уже получаем `allowedBranchNames` и `hasRestrictions`
- Передать в хук: `useChatThreadsInfinite(hasManagerBranchRestrictions ? allowedBranchNames : undefined)`
- Это значит:
  - **Админы**: `allowedBranches = undefined` => RPC загружает все чаты (как сейчас)
  - **Менеджеры без ограничений**: то же
  - **Менеджеры с филиалами**: RPC загружает 50 последних чатов только из их филиалов + нераспределённые
- Ручной фильтр `selectedBranch` из dropdown остаётся как дополнительное сужение на клиенте

### 5. Совместимость с ручным фильтром

Ручной dropdown-фильтр по филиалу (строки 1281-1292) продолжает работать поверх серверной фильтрации. Если менеджеру открыты "Мытищи" и "Котельники", а он выбирает в dropdown "Мытищи" -- сервер отдаёт чаты обоих филиалов, клиент дополнительно фильтрует до "Мытищи".

### 6. SQL для self-hosted

Будет создан файл с инструкцией по обновлению RPC на self-hosted сервере, так как миграции Lovable Cloud не применяются к `api.academyos.ru` автоматически.

### Результат

- Менеджер с филиалами "Мытищи" + "Котельники" видит 50 последних чатов **из этих филиалов** + нераспределённые
- Пагинация (infinite scroll) работает в рамках его филиалов
- Админы видят всё как раньше
- Ручной фильтр по филиалу работает как дополнительное сужение
