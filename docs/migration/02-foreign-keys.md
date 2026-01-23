# Foreign Keys - Полный список

> Критично для порядка восстановления данных

## ⚠️ FK на auth.users (ВОССТАНАВЛИВАТЬ ПОСЛЕ auth.users!)

Эти таблицы ссылаются на `auth.users` и должны восстанавливаться ПОСЛЕ импорта пользователей.

| Таблица | Колонка | Constraint | ON DELETE |
|---------|---------|------------|-----------|
| `profiles` | `id` | PRIMARY KEY + FK | CASCADE |
| `assistant_threads` | `owner_id` | FK | CASCADE |
| `message_read_status` | `user_id` | FK | CASCADE |
| `global_chat_read_status` | `last_read_by` | FK | SET NULL |
| `pinned_modals` | `user_id` | FK | CASCADE |
| `audit_log` | `changed_by` | FK | SET NULL |
| `call_logs` | `initiated_by` | FK | SET NULL |
| `push_subscriptions` | `user_id` | FK | CASCADE |
| `notification_preferences` | `user_id` | FK | CASCADE |
| `user_roles` | `user_id` | FK | CASCADE |
| `teachers` | `user_id` | FK | CASCADE |

## Порядок восстановления таблиц (топологическая сортировка)

### Уровень 0 - Независимые таблицы (без FK)

```
organizations
currencies
age_categories
absence_reasons
english_levels
lesson_types
textbooks
course_types
payment_types
sla_thresholds
```

### Уровень 1 - Зависят только от Level 0

```
branches → organizations
courses → organizations, course_types
tariffs → organizations, currencies
clients → organizations, branches
teachers → organizations (+ auth.users!)
profiles → auth.users, organizations
```

### Уровень 2 - Зависят от Level 0-1

```
students → clients, branches, age_categories, english_levels
learning_groups → branches, courses, teachers, tariffs
chat_messages → clients, organizations
payments → students, payment_types
```

### Уровень 3 - Зависят от Level 0-2

```
group_students → learning_groups, students
lesson_sessions → learning_groups, teachers
student_attendance → lesson_sessions, students
balance_transactions → students, payments, lesson_sessions
message_read_status → chat_messages, auth.users
```

### Уровень 4 - Финальные таблицы

```
assistant_threads → auth.users
pinned_modals → auth.users
global_chat_read_status → auth.users
audit_log → organizations, auth.users
```

## Детальный список FK по таблицам

### clients

```sql
ALTER TABLE clients ADD CONSTRAINT clients_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id);
  
ALTER TABLE clients ADD CONSTRAINT clients_branch_id_fkey 
  FOREIGN KEY (branch_id) REFERENCES branches(id);
  
ALTER TABLE clients ADD CONSTRAINT clients_assigned_employee_id_fkey 
  FOREIGN KEY (assigned_employee_id) REFERENCES profiles(id);
```

### students

```sql
ALTER TABLE students ADD CONSTRAINT students_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
  
ALTER TABLE students ADD CONSTRAINT students_branch_id_fkey 
  FOREIGN KEY (branch_id) REFERENCES branches(id);
  
ALTER TABLE students ADD CONSTRAINT students_age_category_id_fkey 
  FOREIGN KEY (age_category_id) REFERENCES age_categories(id);
  
ALTER TABLE students ADD CONSTRAINT students_english_level_id_fkey 
  FOREIGN KEY (english_level_id) REFERENCES english_levels(id);
```

### learning_groups

```sql
ALTER TABLE learning_groups ADD CONSTRAINT learning_groups_branch_id_fkey 
  FOREIGN KEY (branch_id) REFERENCES branches(id);
  
ALTER TABLE learning_groups ADD CONSTRAINT learning_groups_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES courses(id);
  
ALTER TABLE learning_groups ADD CONSTRAINT learning_groups_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES teachers(id);
  
ALTER TABLE learning_groups ADD CONSTRAINT learning_groups_tariff_id_fkey 
  FOREIGN KEY (tariff_id) REFERENCES tariffs(id);
```

### chat_messages

```sql
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
  
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id);
  
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_sender_id_fkey 
  FOREIGN KEY (sender_id) REFERENCES profiles(id);
```

### message_read_status

```sql
ALTER TABLE message_read_status ADD CONSTRAINT fk_message_read_status_message_id 
  FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE;
  
ALTER TABLE message_read_status ADD CONSTRAINT fk_message_read_status_user_id 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

### assistant_threads

```sql
ALTER TABLE assistant_threads ADD CONSTRAINT assistant_threads_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

### pinned_modals

```sql
ALTER TABLE pinned_modals ADD CONSTRAINT pinned_modals_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

### global_chat_read_status

```sql
ALTER TABLE global_chat_read_status ADD CONSTRAINT global_chat_read_status_last_read_by_fkey 
  FOREIGN KEY (last_read_by) REFERENCES auth.users(id);
```

## Циклические зависимости

⚠️ Нет циклических зависимостей в схеме.

## Скрипт удаления всех FK (для импорта данных)

```sql
-- Генерация команд DROP CONSTRAINT
SELECT 'ALTER TABLE ' || tc.table_schema || '.' || tc.table_name || 
       ' DROP CONSTRAINT ' || tc.constraint_name || ';'
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
```

## Скрипт восстановления FK

```sql
-- После импорта данных, восстановить FK
-- См. детальные команды выше для каждой таблицы
```
