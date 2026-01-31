

## План: Перенос сообщений на teacher_id и удаление клиентов-дубликатов

### Обзор
Изменить архитектуру хранения переписки с преподавателями: вместо привязки к `client_id` через `teacher_client_links`, сообщения будут напрямую привязаны к `teacher_id`. После переноса запись клиента удаляется.

### Текущая архитектура
```text
chat_messages.client_id --> clients.id <-- teacher_client_links --> teachers.id
```

### Целевая архитектура
```text
chat_messages.teacher_id --> teachers.id (напрямую)
```

---

### Задачи

#### 1. Миграция базы данных (Lovable Cloud)

**1.1. Добавить колонку `teacher_id` в `chat_messages`:**
```sql
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_teacher_id 
ON chat_messages(teacher_id) WHERE teacher_id IS NOT NULL;
```

**1.2. Добавить колонки мессенджеров в `teachers` (если их нет):**
```sql
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS telegram_user_id text,
ADD COLUMN IF NOT EXISTS telegram_chat_id text,
ADD COLUMN IF NOT EXISTS whatsapp_id text,
ADD COLUMN IF NOT EXISTS max_user_id text,
ADD COLUMN IF NOT EXISTS max_chat_id text;
```

---

#### 2. Обновить ConvertToTeacherModal.tsx

При конвертации клиента в преподавателя:

1. Создать/найти запись преподавателя
2. **Перенести все сообщения**: `UPDATE chat_messages SET teacher_id = :teacherId, client_id = NULL WHERE client_id = :clientId`
3. Скопировать контактные данные (telegram_user_id, whatsapp_id и т.д.) из клиента в преподавателя
4. **Удалить запись клиента**: `DELETE FROM clients WHERE id = :clientId`
5. Удалить связь из `teacher_client_links` (если была)

---

#### 3. Обновить хуки для чатов преподавателей

**3.1. useTeacherChats.ts** - изменить запрос:
```typescript
// Было: через teacher_client_links + client_id
// Станет: напрямую из chat_messages WHERE teacher_id IS NOT NULL
```

**3.2. useInfiniteChatMessagesTyped.ts** - добавить поддержку `teacher_id`:
```typescript
// Для преподавателей: фильтр по teacher_id вместо client_id
```

**3.3. Удалить useTeacherLinkedClientIds.ts** - больше не нужен

---

#### 4. Обновить CRM.tsx

- Убрать фильтрацию через `teacherLinkedClientIds`
- Папка "Преподаватели" показывает чаты с `teacher_id IS NOT NULL`
- Папка "Клиенты" показывает чаты с `teacher_id IS NULL AND client_id IS NOT NULL`

---

#### 5. Обновить вебхуки для преподавателей

При получении входящего сообщения от преподавателя:
1. Проверить `teachers` по telegram_user_id / whatsapp_id / max_user_id
2. Если найден - создать сообщение с `teacher_id` (без `client_id`)
3. Если не найден - создать клиента как обычно

**Файлы:**
- telegram-webhook/index.ts
- whatsapp-webhook/index.ts  
- wappi-whatsapp-webhook/index.ts
- max-webhook/index.ts

---

#### 6. Миграция существующих данных

**SQL для переноса сообщений существующих преподавателей:**
```sql
-- Перенести сообщения на teacher_id
UPDATE chat_messages cm
SET teacher_id = tcl.teacher_id, client_id = NULL
FROM teacher_client_links tcl
WHERE cm.client_id = tcl.client_id;

-- Скопировать контактные данные в teachers
UPDATE teachers t
SET 
  telegram_user_id = COALESCE(t.telegram_user_id, c.telegram_user_id),
  whatsapp_id = COALESCE(t.whatsapp_id, c.whatsapp_id),
  phone = COALESCE(t.phone, c.phone)
FROM teacher_client_links tcl
JOIN clients c ON c.id = tcl.client_id
WHERE tcl.teacher_id = t.id;

-- Удалить клиентов-дубликатов
DELETE FROM clients 
WHERE id IN (SELECT client_id FROM teacher_client_links);

-- Очистить teacher_client_links
DELETE FROM teacher_client_links;
```

---

### Файлы для изменения

| Файл | Действие |
|------|----------|
| database migration | Добавить teacher_id в chat_messages |
| src/components/crm/ConvertToTeacherModal.tsx | Перенос сообщений, удаление клиента |
| src/hooks/useTeacherChats.ts | Запрос по teacher_id |
| src/hooks/useInfiniteChatMessagesTyped.ts | Поддержка teacher_id |
| src/hooks/useTeacherLinkedClientIds.ts | УДАЛИТЬ |
| src/pages/CRM.tsx | Новая логика фильтрации |
| supabase/functions/telegram-webhook/index.ts | Проверка teachers по ID мессенджеров |
| supabase/functions/whatsapp-webhook/index.ts | Проверка teachers по ID мессенджеров |
| supabase/functions/wappi-whatsapp-webhook/index.ts | Проверка teachers по ID мессенджеров |
| supabase/functions/max-webhook/index.ts | Проверка teachers по ID мессенджеров |

---

### Результат

1. Сообщения преподавателей хранятся напрямую с `teacher_id`
2. Нет дублирования записей (клиент + преподаватель)
3. При входящем сообщении от преподавателя - сразу создаётся с `teacher_id`
4. История переписки сохраняется при конвертации

---

### Важно для self-hosted

После одобрения плана потребуется:
1. Выполнить SQL миграции на self-hosted базе
2. Задеплоить обновлённые Edge Functions

