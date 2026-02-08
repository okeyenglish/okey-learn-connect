

## План: Добавление сотрудников для Self-Hosted Supabase

### Суть проблемы

Кнопка "Добавить сотрудника" не отображается, потому что:

1. **Роли загружаются из self-hosted базы** через RPC функции `get_user_roles` и `get_user_role`
2. **Preview Lovable** использует Lovable Cloud Supabase (не self-hosted), где данные о ролях отсутствуют
3. **`AddEmployeeModal`** использует таблицу `employee_invitations`, которой нет в `database.types.ts`

---

## Технические изменения

### 1. Расширить проверку прав доступа

**Файл: `src/components/employees/EmployeesSection.tsx`**

Вместо строгой проверки только на admin, разрешить доступ для:
- `admin`
- `manager`
- `branch_manager`

```typescript
// Строка 24 — заменить:
const userIsAdmin = !rolesLoading && isAdmin(roles);

// На:
const canManageEmployees = !rolesLoading && (
  isAdmin(roles) || 
  roles?.includes('manager') || 
  roles?.includes('branch_manager')
);
```

```typescript
// Строка 109 — заменить userIsAdmin на canManageEmployees:
{canManageEmployees && (
  <Button onClick={() => setShowAddModal(true)}>
    <Plus className="h-4 w-4 mr-2" />
    Добавить сотрудника
  </Button>
)}
```

---

### 2. Добавить интерфейс EmployeeInvitation в типы

**Файл: `src/integrations/supabase/database.types.ts`**

Добавить интерфейс для таблицы приглашений (после строки ~616):

```typescript
export type EmployeeInvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface EmployeeInvitation {
  id: string;
  organization_id: string;
  first_name: string;
  phone: string;
  branch: string | null;
  position: string;
  invite_token: string;
  status: EmployeeInvitationStatus;
  created_by: string | null;
  accepted_by: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}
```

Добавить в CustomDatabase.Tables:

```typescript
employee_invitations: {
  Row: EmployeeInvitation;
  Insert: Partial<EmployeeInvitation>;
  Update: Partial<EmployeeInvitation>;
  Relationships: [
    { foreignKeyName: "employee_invitations_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
  ];
};
```

---

### 3. SQL миграция для Self-Hosted

Для создания таблицы `employee_invitations` на self-hosted сервере:

```sql
-- Создаём enum для статуса
DO $$ BEGIN
  CREATE TYPE employee_invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Создаём таблицу приглашений сотрудников
CREATE TABLE IF NOT EXISTS public.employee_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  branch TEXT,
  position TEXT NOT NULL DEFAULT 'manager',
  invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id),
  accepted_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT now() + interval '7 days',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS политики
ALTER TABLE public.employee_invitations ENABLE ROW LEVEL SECURITY;

-- Пользователи организации могут просматривать свои приглашения
CREATE POLICY "Users can view their organization invitations" ON public.employee_invitations
  FOR SELECT USING (organization_id = get_user_organization_id());

-- Менеджеры могут создавать приглашения
CREATE POLICY "Managers can create invitations" ON public.employee_invitations
  FOR INSERT WITH CHECK (
    organization_id = get_user_organization_id() AND
    (is_admin() OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'branch_manager'))
  );

-- Менеджеры могут обновлять приглашения
CREATE POLICY "Managers can update invitations" ON public.employee_invitations
  FOR UPDATE USING (
    organization_id = get_user_organization_id() AND
    (is_admin() OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'branch_manager'))
  );

-- Service role для edge functions
CREATE POLICY "Service role full access" ON public.employee_invitations
  FOR ALL USING (true);

-- Триггер обновления updated_at
CREATE TRIGGER update_employee_invitations_updated_at
  BEFORE UPDATE ON public.employee_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Индексы
CREATE INDEX IF NOT EXISTS idx_employee_invitations_org ON public.employee_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_token ON public.employee_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_status ON public.employee_invitations(status);
```

---

### 4. Назначение роли admin (SQL для self-hosted)

```sql
-- Уже предоставлено ранее, но для полноты:
INSERT INTO user_roles (user_id, role) 
VALUES ('0a5d61cf-f502-464c-887a-86ad763cf7e7', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## Порядок действий

1. **Применить изменения в коде** (EmployeesSection.tsx, database.types.ts)
2. **Выполнить SQL миграцию** на self-hosted для создания таблицы `employee_invitations`
3. **Убедиться что роль admin назначена** для пользователя `0a5d61cf-f502-464c-887a-86ad763cf7e7`
4. **Задеплоить код на self-hosted** или проверить в production CRM

---

## Результат

- Кнопка "Добавить сотрудника" будет видна для admin, manager, branch_manager
- Модальное окно создаёт приглашение с токеном
- Сотрудник получает ссылку для заполнения анкеты
- Типы TypeScript соответствуют self-hosted схеме

