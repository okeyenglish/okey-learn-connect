
# План исправления ссылки HolyHope для учеников

## Суть проблемы

Ссылка на HolyHope формируется неправильно потому что:
1. Колонка `external_id` (где должен храниться HoliHope ID = 39748) отсутствует в таблице `students`
2. Миграция для добавления этой колонки не была применена
3. Код пытается использовать внутренний `student_number` (S35355) вместо реального HoliHope ID

## Шаги исправления

### 1. Добавить колонку external_id в таблицу students
```sql
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS students_external_id_org_unique 
ON public.students(external_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_students_external_id 
ON public.students(external_id);
```

### 2. Обновить RPC функцию get_family_data_optimized
Добавить `external_id` в возвращаемые данные студентов:
```sql
'external_id', s.external_id,
```

### 3. Обновить useFamilyData.ts
- Добавить `external_id?: string` в интерфейс `RpcStudent`
- Маппить `external_id` на поле `holihopeId` в объекте студента

### 4. Обновить FamilyCard.tsx
Использовать `student.holihopeId` напрямую вместо парсинга `studentNumber`:
```tsx
// Было (неправильно):
const hollihopeId = student.studentNumber?.replace(/^S/i, '') || null;

// Станет (правильно):
const hollihopeId = student.holihopeId || null;
```

## Технические детали

| Файл | Изменение |
|------|-----------|
| Миграция SQL | Добавление колонки `external_id` |
| `get_family_data_optimized` | Возврат `external_id` в JSON |
| `src/hooks/useFamilyData.ts` | Интерфейс + маппинг |
| `src/components/crm/FamilyCard.tsx` | Использование `holihopeId` |

## После исправления

После применения миграции нужно будет перезапустить импорт из HoliHope, чтобы `external_id` заполнился для всех студентов.
