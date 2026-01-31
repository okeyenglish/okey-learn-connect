
# План: Исправление HoliHope Profile Links

## Проблема
- `external_id` хранит `ClientId` (24744) — для связи с группами
- URL профиля использует `Id` (39748)
- Это разные поля в API HoliHope

## Решение
Использовать `holihope_metadata->>'Id'` для формирования ссылки на профиль.

### Вариант 1: Обновить RPC (минимальные изменения)

Изменить `get_family_data_optimized` чтобы возвращать оба значения:

```sql
'external_id', s.external_id,  -- ClientId для групп
'holihope_id', s.holihope_metadata->>'Id',  -- Id для ссылки на профиль
```

### Вариант 2: Добавить колонку holihope_id (чище)

1. Добавить колонку `holihope_id TEXT` в таблицу `students`
2. Обновить импорт чтобы сохранял `Id` в `holihope_id`
3. Использовать `holihope_id` для ссылок на профиль

## Рекомендую Вариант 1

Быстрее, не требует миграции, данные уже есть в `holihope_metadata`.

### Изменения

| Файл | Изменение |
|------|-----------|
| RPC `get_family_data_optimized` | Добавить `'holihope_id', s.holihope_metadata->>'Id'` |
| `useFamilyData.ts` | Маппить `holihope_id` на `holihopeId` |
| Нет изменений | `FamilyCard.tsx` уже использует `student.holihopeId` |

### SQL для обновления RPC

```sql
-- В секции students добавить:
'holihope_id', s.holihope_metadata->>'Id',
```

### Обновить docs/selfhosted-migration-add-external-id.sql

Заменить строку с external_id на:
```sql
'external_id', s.external_id,
'holihope_id', s.holihope_metadata->>'Id',
```

### Обновить useFamilyData.ts

```typescript
interface RpcStudent {
  // ...existing fields...
  holihope_id?: string | null;  // Id из HoliHope для ссылки на профиль
}

// В маппинге:
holihopeId: student.holihope_id || student.external_id || undefined,
```
