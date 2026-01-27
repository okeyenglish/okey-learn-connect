
# План: Новая логика добавления преподавателей с автоматическим созданием ID и magic link

## Текущая проблема

Сейчас при добавлении преподавателя требуется ввод email и пароля в модале, затем создаётся `auth.users` через `signUp()`. Это неудобно:
- Администратор должен придумывать пароль за преподавателя
- Преподаватель не подтверждает свои данные сам
- При ошибке в email — аккаунт "сломан"

## Новая логика

При добавлении преподавателя:
1. **Сразу создаётся запись `teachers`** с уникальным `id` (UUID) — преподаватель появляется в корпоративных чатах
2. **Создаётся приглашение** (`teacher_invitations`) с magic link
3. **Администратор отправляет magic link** через WhatsApp/Telegram/email
4. **Преподаватель переходит по ссылке**, заполняет фамилию, email, пароль
5. **Создаётся `auth.users` + `profiles`**, привязывается `teachers.profile_id`

**Особый случай:** Если преподаватель с таким email/телефоном уже есть в системе — ему открывается доступ к новой организации (через `user_roles` + обновление `teachers.profile_id`).

## Компоненты для разработки

### 1. Миграция базы данных

Создание таблицы `teacher_invitations` (по аналогии с `employee_invitations`):

```sql
CREATE TABLE public.teacher_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  branch TEXT,
  invite_token TEXT NOT NULL UNIQUE DEFAULT (
    replace(gen_random_uuid()::text, '-', '') || 
    replace(gen_random_uuid()::text, '-', '')
  ),
  token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE teacher_invitations ENABLE ROW LEVEL SECURITY;

-- Политики
CREATE POLICY "teacher_invitations_select" ON teacher_invitations 
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    OR invite_token IS NOT NULL
  );

CREATE POLICY "teacher_invitations_insert" ON teacher_invitations 
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "teacher_invitations_update" ON teacher_invitations 
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    OR invite_token IS NOT NULL
  );
```

### 2. Обновление `AddTeacherModal`

Переработка формы:
- Убрать поля `email` и `password` (они необязательны)
- Оставить: `firstName`, `lastName` (опционально), `phone`, `branch`
- После создания показывать экран с magic link (как в `AddEmployeeModal`)

```text
┌─────────────────────────────────────────────────────────────┐
│                    Шаг 1: Форма                             │
│  • Имя *                                                    │
│  • Фамилия                                                  │
│  • Телефон *                                                │
│  • Филиал                                                   │
│  • Email (опционально, для автопривязки)                    │
│                                                             │
│                    [Создать]                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Шаг 2: Отправка ссылки                    │
│                                                             │
│  Приглашение для Анна создано!                              │
│                                                             │
│  [https://app.../teacher/onboarding/abc123...]  [📋 Copy]  │
│                                                             │
│  [📱 WhatsApp]  [✈️ Telegram]  [📧 Email]                  │
│                                                             │
│                      [Готово]                               │
└─────────────────────────────────────────────────────────────┘
```

**Логика создания:**
1. Проверяем существующий профиль по email/phone
2. Если найден — создаём `teachers` с `profile_id`, добавляем роль `teacher`
3. Если не найден — создаём `teachers` без `profile_id`, создаём `teacher_invitations`

### 3. Страница онбординга преподавателя

Новая страница `/teacher/onboarding/:token`:

**Файл:** `src/pages/teacher/TeacherOnboarding.tsx`

```text
┌─────────────────────────────────────────────────────────────┐
│                   🎓 Добро пожаловать!                      │
│                                                             │
│   Школа "Okey English" приглашает вас как преподавателя    │
│                                                             │
│   ┌─────────────────────────────────────┐                   │
│   │ Имя: Анна                           │                   │
│   │ Телефон: +7 (916) 123-45-67         │                   │
│   │ Филиал: Люберцы                     │                   │
│   └─────────────────────────────────────┘                   │
│                                                             │
│   Фамилия *          [________________]                     │
│   Email *            [________________]                     │
│   Пароль *           [________________]                     │
│   Подтверждение *    [________________]                     │
│                                                             │
│   ☑ Принимаю условия работы                                │
│                                                             │
│                 [Завершить регистрацию]                     │
└─────────────────────────────────────────────────────────────┘
```

### 4. Edge Function: `complete-teacher-onboarding`

**Файл:** `supabase/functions/complete-teacher-onboarding/index.ts`

Логика:
1. Валидация `invite_token`
2. Проверка статуса и срока действия приглашения
3. Проверка существующего пользователя с таким email
   - Если существует — привязываем к преподавателю, добавляем роль
   - Если не существует — создаём через `auth.admin.createUser`
4. Обновляем `profiles` с `organization_id`
5. Добавляем роль `teacher` в `user_roles`
6. Обновляем `teachers.profile_id`
7. Обновляем статус приглашения на `accepted`

### 5. Хук `useTeacherInvitations`

**Файл:** `src/hooks/useTeacherInvitations.ts`

По аналогии с `useEmployeeInvitations`:
- Получение списка приглашений
- Отмена приглашения
- Переотправка приглашения

### 6. Обновление маршрутизации

Добавить новый маршрут в `App.tsx`:

```typescript
<Route path="/teacher/onboarding/:token" element={<TeacherOnboarding />} />
```

## Особые случаи

### Преподаватель уже в системе (другая организация)

Если email/телефон найден в `profiles` другой организации:
1. Создаём запись `teachers` с найденным `profile_id`
2. Не создаём приглашение — сразу активен
3. Показываем уведомление "Преподаватель уже в системе, доступ открыт"

### Преподаватель в этой организации (другая роль)

Если пользователь уже есть в организации (например, как manager):
1. Создаём запись `teachers` с его `profile_id`
2. Добавляем роль `teacher` через upsert
3. Не требуется повторная регистрация

## Порядок реализации

1. Миграция БД — создание таблицы `teacher_invitations`
2. Edge Function `complete-teacher-onboarding`
3. Обновление `config.toml`
4. Страница `TeacherOnboarding.tsx`
5. Хук `useTeacherInvitations.ts`
6. Переработка `AddTeacherModal.tsx`
7. Обновление маршрутизации
8. Тестирование всех сценариев

## Технические детали

### Структура `teacher_invitations`

| Колонка | Тип | Описание |
|---------|-----|----------|
| id | UUID | Первичный ключ |
| organization_id | UUID | Организация (FK) |
| teacher_id | UUID | Связь с teachers (FK) |
| first_name | TEXT | Имя |
| last_name | TEXT | Фамилия (заполняется при онбординге) |
| phone | TEXT | Телефон |
| email | TEXT | Email (заполняется при онбординге) |
| branch | TEXT | Филиал |
| invite_token | TEXT | Уникальный токен приглашения |
| token_expires_at | TIMESTAMPTZ | Срок действия |
| status | TEXT | pending/accepted/expired/cancelled |
| created_by | UUID | Кто создал |
| created_at | TIMESTAMPTZ | Дата создания |
| updated_at | TIMESTAMPTZ | Дата обновления |

### Безопасность

- JWT верификация включена для Edge Function
- RLS политики ограничивают доступ к приглашениям
- Токены генерируются криптографически безопасно
- Пароли проверяются на минимальную длину
