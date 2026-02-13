
# Teacher Display ID (T-номер)

## Что будет сделано

Добавим уникальный отображаемый ID для преподавателей в формате `#T00001`, аналогично клиентам (`#C99746`) и ученикам. Этот номер будет автоматически генерироваться при создании записи преподавателя и отображаться в профиле преподавателя рядом с ФИО.

## Шаги реализации

### 1. Миграция базы данных
- Добавить колонку `teacher_number` (text, nullable) в таблицу `teachers`
- Создать функцию `generate_teacher_number()` по аналогии с `generate_client_number()` -- формат `T` + порядковый номер (например, `T00001`)
- Создать триггер на INSERT, который автоматически заполняет `teacher_number`
- Заполнить `teacher_number` для всех существующих преподавателей

### 2. Отображение в профиле преподавателя
- В файле `src/components/teacher/TeacherProfile.tsx` добавить отображение `#T00001` рядом с ФИО в секции "Основная информация"
- Стиль: моноширинный шрифт, приглушённый цвет, как у клиентских номеров

### 3. Обновление типов
- Добавить поле `teacher_number` в интерфейс `Teacher` в хуке `useTeachers`

---

### Технические детали

**SQL миграция:**

```text
-- Колонка
ALTER TABLE teachers ADD COLUMN teacher_number text;

-- Функция генерации
CREATE OR REPLACE FUNCTION generate_teacher_number()
RETURNS TRIGGER AS $$
DECLARE next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(teacher_number FROM '[0-9]+$') AS integer)), 0) + 1
  INTO next_num FROM teachers WHERE organization_id = NEW.organization_id;
  NEW.teacher_number := 'T' || LPAD(next_num::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер
CREATE TRIGGER set_teacher_number
BEFORE INSERT ON teachers
FOR EACH ROW WHEN (NEW.teacher_number IS NULL)
EXECUTE FUNCTION generate_teacher_number();

-- Заполнение существующих
WITH numbered AS (
  SELECT id, organization_id,
    ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at) as rn
  FROM teachers WHERE teacher_number IS NULL
)
UPDATE teachers SET teacher_number = 'T' || LPAD(numbered.rn::text, 5, '0')
FROM numbered WHERE teachers.id = numbered.id;
```

**UI изменения в TeacherProfile.tsx:**
- Под заголовком "Профиль преподавателя" добавить Badge с номером `#T00001`
- Использовать иконку `IdCard` (уже импортирована)
