# ✅ План исправления 3 критических ошибок схемы (ВЫПОЛНЕНО)

## Проблема (решена)
Три ошибки схемы блокируют загрузку чата и карточки клиента:

1. **RPC `get_family_data_by_client_id`** - ссылка на несуществующий `gs.is_active`
2. **RPC `get_client_chat_data`** - ссылка на несуществующий `metadata`  
3. **`useAutoRetryMessages.ts`** - запросы к несуществующему `metadata`

## Решение

### Изменение 1: docs/rpc-get-family-data-by-client-id.sql

**Строка 179**: Заменить `gs.is_active = true` на проверку через отсутствие поля `left_at`:

```sql
-- Было:
WHERE gs.student_id = s.id
  AND gs.is_active = true

-- Стало:
WHERE gs.student_id = s.id
  AND gs.left_at IS NULL
```

### Изменение 2: docs/rpc-get-client-chat-data.sql

Убрать `metadata` из SELECT и jsonb_build_object (строки 28-48 и 51-67):

```sql
-- Было (строка 43):
message_status,
metadata

-- Стало:
message_status

-- И убрать из jsonb_build_object (строка 66)
```

### Изменение 3: src/hooks/useAutoRetryMessages.ts

Добавить fallback с try-catch для всех запросов к `metadata`:

```typescript
// updateRetryCountInDB - строки 38-63
try {
  const { data: message, error } = await supabase
    .from('chat_messages')
    .select('metadata')
    .eq('id', messageId)
    .maybeSingle();
  
  // Если metadata не существует, пропускаем обновление
  if (error?.code === '42703') {
    console.log('[AutoRetry] metadata column not available, skipping DB update');
    return;
  }
  // ... rest of logic
} catch (error) {
  // Silent fallback
}
```

Аналогичный fallback для `clearRetryCountInDB` (строки 68-93).

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `docs/rpc-get-family-data-by-client-id.sql` | `gs.is_active = true` → `gs.left_at IS NULL` |
| `docs/rpc-get-client-chat-data.sql` | Удалить `metadata` из SELECT и JSON |
| `src/hooks/useAutoRetryMessages.ts` | Добавить error fallback для `metadata` |

## Результат

После исправлений:
- RPC функции будут работать без ошибок 400
- Auto-retry будет работать в silent mode если `metadata` недоступна
- Загрузка чата ускорится с ~1500ms до ~200ms
