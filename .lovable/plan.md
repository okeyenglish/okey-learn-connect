

## Проблема

Компонент `FamilyCardWrapper` пытается загрузить данные клиента через цепочку: RPC `get_family_data_by_client_id` -> RPC `get_or_create_family_group_id` -> таблицы `family_members`/`family_groups`/`client_phone_numbers`. Если эти RPC и таблицы не существуют на self-hosted сервере, все fallback-ы возвращают `null`, и пользователь видит "Не удалось загрузить данные клиента".

## Решение

Добавить финальный fallback в `FamilyCardWrapper.tsx`: если все RPC и таблицы семейных групп недоступны, загрузить данные напрямую из таблицы `clients` и сформировать минимальный объект `FamilyGroup`.

## Изменения

### `src/components/crm/FamilyCardWrapper.tsx`

**1. В функции `fetchFamilyDataLegacy` (строка 366-367)** -- вместо `return null` при отсутствии `familyGroupId`, добавить прямой запрос к таблице `clients`:

```typescript
if (!familyGroupId) {
  // Direct client fallback - family tables not available
  return fetchClientDirectFallback(clientId);
}
```

**2. В функции `fetchFamilyDataByClientId` (строка 312-314)** -- добавить аналогичный fallback при пустом ответе unified RPC.

**3. Новая функция `fetchClientDirectFallback`** -- загружает данные клиента из таблицы `clients` и формирует минимальный `FamilyGroup`:

```text
fetchClientDirectFallback(clientId):
  1. SELECT id, name, phone, email, avatar_url, branch FROM clients WHERE id = clientId
  2. Если данные есть - сформировать FamilyGroup с одним member и пустым списком students
  3. Если нет - return null
```

**4. В функции `fetchFamilyGroupIdLegacy`** -- обернуть запросы к `family_members` и `family_groups` в try/catch, чтобы ошибки "relation does not exist" (42P01) не прерывали выполнение, а позволяли дойти до direct fallback.

## Что нужно от вас

Ничего дополнительного -- все данные берутся из таблицы `clients`, которая точно существует на self-hosted сервере. Таблицы `family_members`/`family_groups` и RPC функции не обязательны.

