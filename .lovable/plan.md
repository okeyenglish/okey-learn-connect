
# Исправление: Клиенты с непрочитанными сообщениями скрываются от менеджеров

## Суть проблемы

Менеджеры видят клиентов в списке чатов, но когда появляется **непрочитанное входящее сообщение**, клиент исчезает из списка. Админ при этом продолжает видеть такого клиента.

## Диагноз

После анализа кода выявлено несколько точек отказа:

### 1. RPC-функция `get_unread_chat_threads` (self-hosted)

В файле `docs/rpc-get-unread-chat-threads.sql` функция использует `SECURITY INVOKER`, то есть выполняется с правами текущего пользователя. Если в базе есть RLS-политики на таблицах `chat_messages` или `clients`, которые ограничивают доступ по филиалу, то менеджер не увидит клиентов с непрочитанными сообщениями, если:
- У клиента `branch = NULL`
- У клиента `branch`, который не совпадает с филиалами менеджера по RLS-логике в БД

### 2. Два разных потока данных в `useChatThreadsInfinite`

- **`unreadQuery`** — загружает RPC `get_unread_chat_threads` (клиенты с непрочитанными)
- **`infiniteQuery`** — загружает RPC `get_chat_threads_paginated` (все клиенты постранично)

При слиянии данных приоритет у `unreadQuery`. Если RPC для непрочитанных возвращает пустой массив (из-за RLS), клиент исчезает из списка.

### 3. Миграции RLS на clients/chat_messages

В файлах миграций видно, что были политики типа:
```sql
CREATE POLICY "managers_branch_clients" ON public.clients
  FOR ALL USING (branch IN (SELECT unnest(get_user_branches(auth.uid()))));
```

Это означает: менеджер видит только клиентов, чей `branch` входит в его список филиалов. Если `branch = NULL`, клиент не попадает в выборку.

Аналогично для `chat_messages`:
```sql
CREATE POLICY "managers_branch_messages" ON public.chat_messages
  FOR ALL USING (EXISTS (
    SELECT 1 FROM clients c WHERE c.id = chat_messages.client_id
    AND c.branch IN (SELECT unnest(get_user_branches(auth.uid())))
  ));
```

## Решение

### Шаг 1: Обновить RLS-политики на self-hosted базе

Нужно изменить политики так, чтобы клиенты с `branch = NULL` были видны менеджерам (согласно требованию "показывать null-branch"):

```sql
-- clients: показывать клиентов с branch в списке менеджера ИЛИ с branch = NULL
DROP POLICY IF EXISTS "managers_branch_clients" ON public.clients;
CREATE POLICY "managers_branch_clients" ON public.clients
  FOR SELECT USING (
    branch IS NULL  -- <-- добавляем NULL
    OR branch IN (SELECT unnest(get_user_branches(auth.uid())))
  );

-- chat_messages: сообщения клиентов с branch = NULL тоже видны
DROP POLICY IF EXISTS "managers_branch_messages" ON public.chat_messages;
CREATE POLICY "managers_branch_messages" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients c 
      WHERE c.id = chat_messages.client_id
      AND (c.branch IS NULL OR c.branch IN (SELECT unnest(get_user_branches(auth.uid()))))
    )
  );
```

### Шаг 2: Проверить RPC-функцию `get_unread_chat_threads`

Убедиться, что в теле функции нет дополнительной фильтрации по `branch`, которая отсекает `NULL`. Если есть - убрать или добавить `OR branch IS NULL`.

### Шаг 3: Обновить клиентский fallback `fetchThreadsDirectly`

В `src/hooks/useChatThreadsInfinite.ts` fallback-функция уже не фильтрует по филиалу (она просто загружает клиентов). Но нужно убедиться, что при слиянии данных не происходит потери:

**Проверить `canAccessBranch` в `useManagerBranches`:**
```typescript
// Текущая логика (fail-closed для null):
if (!clientBranch) return false;

// Нужно изменить на (fail-open для null):
if (!clientBranch) return true;
```

### Шаг 4: Применить изменение в `canAccessBranch`

```typescript
// src/hooks/useManagerBranches.ts, строка 144-146
// Было:
if (!clientBranch) return false;

// Стало:
if (!clientBranch) return true; // Менеджер видит клиентов без филиала
```

Аналогичное изменение в `useUserAllowedBranches.ts` уже есть (строка 77: `if (!branchName) return true;`), но нужно согласовать логику.

## Технический план изменений

| Файл | Изменение |
|------|-----------|
| `src/hooks/useManagerBranches.ts` | Изменить `canAccessBranch`: `if (!clientBranch) return true;` вместо `false` |
| **self-hosted DB (вручную)** | Обновить RLS-политики для `clients` и `chat_messages`, добавив `OR branch IS NULL` |
| **self-hosted DB (вручную)** | Проверить RPC `get_unread_chat_threads` на отсутствие фильтрации по branch |

## SQL-скрипт для self-hosted (выполнить вручную)

```sql
-- 1. Обновить политику clients для менеджеров (если она есть)
DROP POLICY IF EXISTS "managers_branch_clients" ON public.clients;

-- 2. Обновить политику chat_messages для менеджеров (если она есть)
DROP POLICY IF EXISTS "managers_branch_messages" ON public.chat_messages;

-- Если политики используют другие имена, выполнить:
-- SELECT policyname FROM pg_policies WHERE tablename IN ('clients', 'chat_messages');
-- И удалить/пересоздать нужные с добавлением OR branch IS NULL

-- 3. Проверить RPC
-- SELECT prosrc FROM pg_proc WHERE proname = 'get_unread_chat_threads';
```

## Ожидаемый результат

После применения изменений:
1. Менеджер видит клиентов с `branch = NULL` или с его филиалом
2. При появлении непрочитанного сообщения клиент **остается видимым** в списке
3. Счетчик непрочитанных корректно увеличивается
4. Кнопка "Непрочитанные" показывает всех клиентов с непрочитанными сообщениями, включая тех, у кого `branch = NULL`
