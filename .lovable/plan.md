
# План исправления ошибок схемы group_students

## Проблема
На self-hosted базе таблица `group_students` имеет другую структуру:
- **Нет** колонки `is_active`
- **Нет** колонки `left_at`
- **Есть** колонка `status` (string) — используется для определения активности

## Изменения

### 1. Исправить `docs/rpc-get-family-data-by-client-id.sql`

**Строка 179**: Заменить условие фильтрации активных студентов:

```sql
-- Было (ошибка: column gs.left_at does not exist):
WHERE gs.student_id = s.id
  AND gs.left_at IS NULL

-- Стало (правильно для self-hosted схемы):
WHERE gs.student_id = s.id
  AND gs.status = 'active'
```

### 2. Добавить команду обновления schema cache

В конец SQL-файла добавить:

```sql
-- Обновить schema cache после DDL изменений
NOTIFY pgrst, 'reload schema';
```

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `docs/rpc-get-family-data-by-client-id.sql` | `gs.left_at IS NULL` → `gs.status = 'active'` |

## После применения

После выполнения обновлённого SQL на self-hosted базе:
1. RPC `get_family_data_by_client_id` будет работать без ошибок
2. PostgREST schema cache автоматически обновится
3. Загрузка карточки клиента ускорится

## Техническая деталь

Схема `group_students` на self-hosted:
```typescript
interface GroupStudent {
  id: string;
  group_id: string;
  student_id: string;
  status: string;       // 'active', 'left', 'expelled', etc.
  enrollment_type: string | null;
  enrollment_date: string | null;
  notes: string | null;
  created_at: string;
}
```
