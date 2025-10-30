# Teacher Portal - Руководство

## Архитектура

Teacher Portal — это персональный кабинет преподавателя, который предоставляет доступ к расписанию, журналу, материалам и другим инструментам.

### Компоненты

- **TeacherPortal** (`src/pages/TeacherPortal.tsx`) - главная страница-обёртка
- **TeacherLayout** (`src/components/teacher/TeacherLayout.tsx`) - layout с навигацией и header
- **Вкладки:**
  - `TeacherHome` - главная страница с дашбордом
  - `TeacherJournal` - журнал занятий
  - `TeacherMaterials` - учебные материалы
  - `TeacherSchedule` - расписание
  - `TeacherSubstitutions` - замены
  - `TeacherProfile` - профиль преподавателя
- **TeacherAIHub** - плавающая кнопка с AI ассистентом и чатами

## Структура базы данных

### Ключевые таблицы

#### 1. `profiles`
Профили пользователей (связь с auth.users)
- `id` (UUID) - PK, ссылка на auth.users
- `first_name`, `last_name` - имя и фамилия
- `email` - email пользователя
- `organization_id` - организация

#### 2. `user_roles`
Роли пользователей
- `user_id` (UUID) - FK → profiles.id
- `role` (enum) - роль: 'teacher', 'admin', 'manager', и т.д.

#### 3. `teachers`
Данные преподавателей
- `id` (UUID) - PK
- `profile_id` (UUID) - FK → profiles.id ⚡ **КЛЮЧЕВАЯ СВЯЗЬ**
- `first_name`, `last_name` - имя и фамилия
- `email` - email
- `phone` - телефон
- `subjects` (text[]) - предметы
- `categories` (text[]) - категории (Adults, Kids)
- `branch` - филиал
- `is_active` - активен ли преподаватель

#### 4. `learning_groups`
Учебные группы
- `id` (UUID) - PK
- `name` - название группы
- `responsible_teacher` (text) - ФИО преподавателя (формат: "Фамилия Имя")
- `subject`, `level` - предмет и уровень
- `branch` - филиал
- `is_active` - активна ли группа

#### 5. `lesson_sessions`
Сессии занятий
- `id` (UUID) - PK
- `group_id` (UUID) - FK → learning_groups.id
- `teacher_name` (text) - ФИО преподавателя
- `lesson_date` - дата занятия
- `start_time`, `end_time` - время начала и окончания
- `classroom` - кабинет
- `status` - статус: 'scheduled', 'ongoing', 'completed', 'cancelled'
- `branch` - филиал

### Связи между таблицами

```
auth.users (Supabase Auth)
    ↓
profiles.id (1:1)
    ↓
user_roles (1:N) → role = 'teacher'
    ↓
teachers.profile_id (1:1) ⚡ ГЛАВНАЯ СВЯЗЬ
    ↓
learning_groups.responsible_teacher (text match: "Фамилия Имя")
    ↓
lesson_sessions.group_id → learning_groups.id
```

## Процесс входа преподавателя

### 1. Регистрация и создание профиля
```
Пользователь → /auth (регистрация) → Создаётся profiles запись
```

### 2. Назначение роли преподавателя
Администратор назначает роль через админ-панель:
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('uuid-профиля', 'teacher');
```

### 3. Создание записи преподавателя
Администратор создаёт запись в `teachers` с **обязательным** заполнением `profile_id`:
```sql
INSERT INTO teachers (
  profile_id,
  first_name,
  last_name,
  email,
  subjects,
  branch,
  is_active
) VALUES (
  'uuid-профиля',
  'Мария',
  'Иванова',
  'maria@example.com',
  ARRAY['Английский'],
  'OKEY ENGLISH Окская',
  true
);
```

### 4. Назначение групп
Группам назначается преподаватель через поле `responsible_teacher`:
```sql
UPDATE learning_groups
SET responsible_teacher = 'Иванова Мария'
WHERE id = 'uuid-группы';
```

### 5. Доступ к порталу
Преподаватель переходит на `/teacher-portal`:
```
TeacherLayout → Находит profile → 
Ищет teachers WHERE profile_id = profile.id →
Загружает группы WHERE responsible_teacher = "Фамилия Имя" →
Отображает расписание
```

## Основная логика TeacherLayout

```typescript
// src/components/teacher/TeacherLayout.tsx

// 1. Получаем профиль авторизованного пользователя
const { profile } = useAuth();

// 2. Ищем преподавателя по profile_id (НОВЫЙ СПОСОБ - надёжный)
const { data: teacher } = useQuery({
  queryKey: ['teacher-by-profile', profile?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from('teachers')
      .select('*')
      .eq('profile_id', profile.id)
      .eq('is_active', true)
      .maybeSingle();
    return data;
  },
});

// 3. Если преподаватель найден, отображаем портал
if (teacher) {
  return <TeacherPortalContent teacher={teacher} />;
}
```

## Частые проблемы и решения

### ❌ Проблема: "Teacher not found"
**Причина:** Нет связи между `profiles` и `teachers`

**Решение:**
```sql
-- Проверяем наличие записи
SELECT * FROM teachers WHERE profile_id = 'uuid-профиля';

-- Если нет, создаём
INSERT INTO teachers (profile_id, first_name, last_name, ...)
VALUES ('uuid-профиля', ...);
```

### ❌ Проблема: Пустое расписание
**Причина:** Группы не назначены преподавателю

**Решение:**
```sql
-- Назначаем группы
UPDATE learning_groups
SET responsible_teacher = 'Иванова Мария'
WHERE id IN (SELECT id FROM learning_groups LIMIT 3);
```

### ❌ Проблема: Нет занятий в расписании
**Причина:** В `lesson_sessions` не указан `teacher_name`

**Решение:**
```sql
-- Обновляем занятия
UPDATE lesson_sessions ls
SET teacher_name = 'Иванова Мария'
FROM learning_groups lg
WHERE ls.group_id = lg.id
AND lg.responsible_teacher = 'Иванова Мария';
```

## Тестирование

### Страница тестирования
Доступна страница `/teacher-portal-test` (только для администраторов) для проверки:

- ✅ Профили с ролью `teacher`
- ✅ Преподаватели с данными
- ✅ Связь `Profile → Teacher` через `profile_id`
- ✅ Группы с назначенными преподавателями
- ✅ Занятия с указанными преподавателями

### Ручная проверка через SQL

```sql
-- 1. Проверка связи profile → teacher
SELECT 
  p.id as profile_id,
  p.first_name,
  p.last_name,
  t.id as teacher_id,
  t.profile_id
FROM profiles p
INNER JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN teachers t ON t.profile_id = p.id
WHERE ur.role = 'teacher';

-- 2. Проверка групп преподавателя
SELECT 
  lg.id,
  lg.name,
  lg.responsible_teacher,
  COUNT(ls.id) as sessions_count
FROM learning_groups lg
LEFT JOIN lesson_sessions ls ON ls.group_id = lg.id
WHERE lg.responsible_teacher = 'Иванова Мария'
GROUP BY lg.id, lg.name, lg.responsible_teacher;

-- 3. Проверка расписания
SELECT 
  ls.lesson_date,
  ls.start_time,
  ls.teacher_name,
  lg.name as group_name,
  ls.status
FROM lesson_sessions ls
LEFT JOIN learning_groups lg ON lg.id = ls.group_id
WHERE ls.teacher_name = 'Иванова Мария'
ORDER BY ls.lesson_date DESC, ls.start_time;
```

## Создание тестовых данных

См. миграцию `add_profile_id_to_teachers.sql`, которая автоматически:
1. Добавляет `profile_id` в `teachers`
2. Связывает существующих преподавателей с профилями
3. Создаёт тестового преподавателя для первого профиля с ролью `teacher`
4. Назначает группы тестовому преподавателю
5. Создаёт расписание на неделю

## Безопасность (RLS Policies)

### teachers
```sql
-- Преподаватели видят только себя
CREATE POLICY "Teachers can view own record"
ON teachers FOR SELECT
USING (profile_id = auth.uid());

-- Администраторы видят всех
CREATE POLICY "Admins can view all teachers"
ON teachers FOR SELECT
USING (has_role(auth.uid(), 'admin'));
```

### learning_groups
```sql
-- Преподаватели видят свои группы
CREATE POLICY "Teachers can view own groups"
ON learning_groups FOR SELECT
USING (
  responsible_teacher = (
    SELECT last_name || ' ' || first_name
    FROM teachers
    WHERE profile_id = auth.uid()
  )
);
```

## Roadmap

- [ ] Добавить прямую связь `learning_groups.teacher_id` → `teachers.id` (вместо text match)
- [ ] Добавить `lesson_sessions.teacher_id` → `teachers.id`
- [ ] Интеграция с календарём Google Calendar
- [ ] Push-уведомления о предстоящих занятиях
- [ ] Статистика преподавателя (рейтинг, отзывы)
- [ ] Экспорт расписания в PDF/Excel
