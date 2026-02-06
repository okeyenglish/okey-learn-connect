
## План: Исправление реакций на сообщения

### Проблема

Таблица `message_reactions` на self-hosted сервере (`api.academyos.ru`) **не содержит колонку `user_type`**, но код пытается её записывать:

```
Error: Could not find the 'user_type' column of 'message_reactions' in the schema cache
```

### Решение

Убрать `user_type` из операций записи в базу данных и сделать поле опциональным в типах.

### Изменения

#### 1. `src/hooks/useBatchMessageReactions.ts`

**Строка 141-146** - убрать `user_type`:

```typescript
// Было:
.upsert({
  message_id: messageId,
  user_id: user.id,
  user_type: 'manager',  // ❌ Колонка не существует
  emoji: emoji,
}, ...

// Станет:
.upsert({
  message_id: messageId,
  user_id: user.id,
  emoji: emoji,
}, ...
```

#### 2. `src/hooks/useMessageReactions.ts`

**Строка 105-110** - убрать `user_type`:

```typescript
// Было:
.upsert({
  message_id: messageId,
  user_id: user.id,
  user_type: 'manager',  // ❌ Колонка не существует
  emoji: emoji,
}, ...

// Станет:
.upsert({
  message_id: messageId,
  user_id: user.id,
  emoji: emoji,
}, ...
```

#### 3. `src/integrations/supabase/database.types.ts`

**Строка 698-705** - сделать `user_type` опциональным для совместимости:

```typescript
// Было:
export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  user_type: string;  // ❌ Обязательное поле
  emoji: string;
  created_at: string;
}

// Станет:
export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  user_type?: string;  // ✅ Опциональное поле
  emoji: string;
  created_at: string;
}
```

### Ожидаемый результат

После исправлений:
- Реакции будут сохраняться локально в БД
- WPP edge function `wpp-react` будет вызываться и отправлять реакцию в WhatsApp
- Ошибка `PGRST204` исчезнет

### Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `src/hooks/useBatchMessageReactions.ts` | Убрать `user_type: 'manager'` из upsert |
| `src/hooks/useMessageReactions.ts` | Убрать `user_type: 'manager'` из upsert |
| `src/integrations/supabase/database.types.ts` | Сделать `user_type` опциональным |

### Техническое примечание

На self-hosted сервере таблица `message_reactions` имеет структуру:
- `id` (uuid)
- `message_id` (uuid)
- `user_id` (uuid)
- `emoji` (text)
- `created_at` (timestamp)

Колонка `user_type` отсутствует и не нужна, т.к. все реакции из CRM — от менеджеров.
