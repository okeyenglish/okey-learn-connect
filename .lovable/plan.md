
# План: Добавление organization_id в таблицу teachers для мультитенантности

## Проблема

Таблица `teachers` на self-hosted инстансе не содержит колонку `organization_id`. Это критическая проблема:

1. **Отсутствует изоляция данных** — преподаватели всех организаций видны всем пользователям
2. **Код ломается при создании** — `TeacherRegistration.tsx`, `ConvertToTeacherModal.tsx` и другие компоненты пытаются записать `organization_id`, которого нет
3. **RLS-политики не работают** — без колонки невозможно ограничить доступ по организации
4. **Дубликаты появляются глобально** — без organization_id триггеры проверяют уникальность телефона по всей базе, а не внутри организации

---

## Что нужно сделать

### Шаг 1: SQL-миграция для добавления organization_id в teachers

Создать файл `docs/migrations/20250130_add_teachers_organization_id.sql`:

```text
┌────────────────────────────────────────────────────────────┐
│  1. ALTER TABLE teachers ADD COLUMN organization_id UUID   │
│  2. Заполнить существующих преподавателей:                 │
│     - через profile_id → profiles.organization_id         │
│     - или через teacher_invitations                        │
│  3. Сделать колонку NOT NULL после заполнения              │
│  4. Создать индекс idx_teachers_organization_id            │
│  5. Добавить RLS-политики по organization_id               │
└────────────────────────────────────────────────────────────┘
```

### Шаг 2: Обновить database.types.ts

Добавить `organization_id: string;` в интерфейс `Teacher`.

### Шаг 3: Обновить триггеры проверки дубликатов

Вернуть фильтрацию по `organization_id` в:
- `check_teacher_phone_duplicate()`
- `find_duplicate_teachers()`

### Шаг 4: Обновить фронтенд-код

| Файл | Что изменить |
|------|--------------|
| `AddTeacherModal.tsx` | Добавить `organization_id` в insert |
| `BulkTeacherImport.tsx` | Добавить `organization_id` в insert |
| `useTeachers.ts` | Опционально: явная фильтрация (RLS должен справляться) |

---

## Технические детали

### SQL-миграция

```sql
-- 1. Добавляем колонку (nullable для безопасного обновления)
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- 2. Заполняем из profiles (через profile_id)
UPDATE teachers t
SET organization_id = p.organization_id
FROM profiles p
WHERE t.profile_id = p.id
  AND t.organization_id IS NULL
  AND p.organization_id IS NOT NULL;

-- 3. Заполняем из teacher_invitations (для незарегистрированных)
UPDATE teachers t
SET organization_id = ti.organization_id
FROM teacher_invitations ti
WHERE t.id = ti.teacher_id
  AND t.organization_id IS NULL
  AND ti.organization_id IS NOT NULL;

-- 4. Для оставшихся — назначаем дефолтную организацию
-- (заменить 'YOUR-ORG-UUID' на реальный ID основной организации)
UPDATE teachers
SET organization_id = 'YOUR-ORG-UUID'
WHERE organization_id IS NULL;

-- 5. Делаем NOT NULL
ALTER TABLE public.teachers
ALTER COLUMN organization_id SET NOT NULL;

-- 6. Создаём индекс
CREATE INDEX IF NOT EXISTS idx_teachers_organization_id 
ON teachers(organization_id);

-- 7. Добавляем Foreign Key (опционально)
-- ALTER TABLE teachers 
-- ADD CONSTRAINT fk_teachers_organization
-- FOREIGN KEY (organization_id) REFERENCES organizations(id);
```

### Обновление RLS-политик

```sql
-- Политика для SELECT
DROP POLICY IF EXISTS "Users can view teachers in their organization" ON teachers;
CREATE POLICY "Users can view teachers in their organization"
  ON teachers FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Политика для INSERT
DROP POLICY IF EXISTS "Users can create teachers in their organization" ON teachers;
CREATE POLICY "Users can create teachers in their organization"
  ON teachers FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());
```

### Обновление триггеров дубликатов

```sql
-- Вернуть фильтрацию по organization_id
SELECT id INTO v_existing_id
FROM teachers
WHERE organization_id = NEW.organization_id  -- ← вернуть эту строку
  AND id != COALESCE(NEW.id, '00000000-...'::uuid)
  AND normalize_phone(phone) = v_normalized_phone
  AND COALESCE(is_active, true) = true
LIMIT 1;
```

### Изменение database.types.ts

```typescript
export interface Teacher {
  id: string;
  profile_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  branch: string | null;
  subjects: string[] | null;
  categories: string[] | null;
  organization_id: string;  // ← ДОБАВИТЬ
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### Изменение AddTeacherModal.tsx

```typescript
const { data: teacher, error: teacherError } = await supabase
  .from('teachers')
  .insert({
    first_name: formData.firstName,
    // ...
    organization_id: organizationId,  // ← ДОБАВИТЬ
  })
  .select('id')
  .single();
```

---

## Результат

После выполнения:
1. ✅ Каждый преподаватель принадлежит конкретной организации
2. ✅ RLS-политики корректно изолируют данные
3. ✅ Дубликаты проверяются внутри одной организации
4. ✅ Код создания преподавателей работает корректно

---

## Файлы для изменения

| Файл | Действие |
|------|----------|
| `docs/migrations/20250130_add_teachers_organization_id.sql` | Создать |
| `docs/migrations/20250130_add_phone_uniqueness_constraints.sql` | Обновить (вернуть org_id) |
| `src/integrations/supabase/database.types.ts` | Обновить интерфейс Teacher |
| `src/components/admin/AddTeacherModal.tsx` | Добавить organization_id |
| `src/components/admin/BulkTeacherImport.tsx` | Добавить organization_id |
