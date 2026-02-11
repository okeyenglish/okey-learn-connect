
# Исправление: массовая привязка клиентов к филиалу не находит клиентов

## Причина
Все 4773 запроса к таблице `clients` возвращают пустой массив `[]` (статус 200). Это происходит потому, что запросы отправляются с `anon key` вместо JWT токена авторизованного пользователя. RLS-политики на таблице `clients` требуют `organization_id = get_user_organization_id()`, а для анонимного ключа `auth.uid()` = NULL, поэтому ни одна строка не проходит фильтр.

## Решение
В файле `src/components/admin/BulkBranchReassign.tsx` заменить использование `SELF_HOSTED_ANON_KEY` в заголовках `Authorization` на JWT токен текущего пользователя из `supabase.auth.getSession()`. Ключ `apikey` остаётся anon key (так требует PostgREST), но `Authorization` должен содержать Bearer-токен пользователя.

## Технические изменения

### Файл: `src/components/admin/BulkBranchReassign.tsx`

1. Добавить импорт supabase клиента:
```typescript
import { supabase } from '@/integrations/supabase/client';
```

2. Добавить вспомогательную функцию для получения заголовков авторизации с токеном пользователя:
```typescript
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || SELF_HOSTED_ANON_KEY;
  return {
    'apikey': SELF_HOSTED_ANON_KEY,
    'Authorization': `Bearer ${token}`,
  };
};
```

3. В функции `processUpdate` (строки 102-175) заменить все хардкод-заголовки на вызов `getAuthHeaders()`:
   - Строка 111: в запросе к `client_phone_numbers`
   - Строка 130: в запросе к `clients` (поиск)
   - Строки 154-156: в PATCH-запросе на обновление филиала

Все три fetch-вызова будут использовать `await getAuthHeaders()` вместо статических заголовков с anon key.

Это единственное необходимое изменение -- проблема не в филиале, а в том, что RLS не пропускает запросы без идентификации пользователя.
