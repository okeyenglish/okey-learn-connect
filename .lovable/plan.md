
# План: Лента активности сотрудников для руководителей

## Цель
Создать систему мониторинга действий сотрудников в реальном времени, чтобы управляющий филиала или администратор мог видеть каждое действие подчиненных.

---

## Архитектура решения

### 1. Новая таблица `staff_activity_log`

```sql
CREATE TABLE public.staff_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Кто выполнил действие
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_branch TEXT,
  
  -- Что сделал
  action_type TEXT NOT NULL, -- 'message_sent', 'call_made', 'task_created', etc.
  action_label TEXT NOT NULL, -- Человекочитаемое описание
  
  -- Контекст действия
  target_type TEXT, -- 'client', 'student', 'task', 'invoice'
  target_id UUID,
  target_name TEXT, -- Имя клиента/студента для быстрого отображения
  
  -- Детали (metadata)
  details JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы для производительности
CREATE INDEX idx_staff_activity_org_time ON staff_activity_log(organization_id, created_at DESC);
CREATE INDEX idx_staff_activity_user ON staff_activity_log(user_id, created_at DESC);
CREATE INDEX idx_staff_activity_branch ON staff_activity_log(user_branch, created_at DESC);
CREATE INDEX idx_staff_activity_type ON staff_activity_log(action_type);
```

### 2. RLS политики

```sql
-- Админы видят всё в организации
CREATE POLICY "Admins view all activity" ON staff_activity_log
FOR SELECT USING (
  organization_id = get_user_organization_id() 
  AND is_admin()
);

-- Управляющие видят по своим филиалам
CREATE POLICY "Branch managers view their branches" ON staff_activity_log
FOR SELECT USING (
  organization_id = get_user_organization_id()
  AND (
    is_admin() 
    OR user_has_branch_access(user_branch)
  )
);
```

---

## Типы активностей

| action_type | action_label | Пример |
|-------------|--------------|--------|
| `message_sent` | Отправил сообщение | "Написал клиенту Иван Петров" |
| `call_made` | Совершил звонок | "Позвонил Андрею Васильеву (2:35)" |
| `call_received` | Принял звонок | "Принял звонок от Мария Сидорова (1:20)" |
| `call_missed` | Пропустил звонок | "Пропущенный от +7 999 123-45-67" |
| `task_created` | Создал задачу | "Создал задачу: Перезвонить клиенту" |
| `task_completed` | Выполнил задачу | "Выполнил задачу: Отправить договор" |
| `invoice_created` | Выставил счёт | "Выставил счёт на 15 000 ₽" |
| `lead_status_changed` | Изменил статус лида | "Перевёл лид в статус 'Думает'" |

---

## Новые файлы

### 1. `src/hooks/useStaffActivityLog.ts`
Хук для получения ленты активности с фильтрами:
- По филиалу
- По типу действия
- По сотруднику
- По дате

### 2. `src/components/crm/StaffActivityFeed.tsx`
Компонент ленты активности:
- Виртуализированный список для производительности
- Аватар сотрудника + имя
- Иконка типа действия
- Время действия (относительное: "2 мин назад")
- Кликабельность для перехода к сущности

### 3. `src/components/crm/StaffActivityFilters.tsx`
Панель фильтров:
- Мультиселект филиалов
- Мультиселект типов действий
- Поиск по сотруднику
- Выбор периода

### 4. `src/pages/crm/StaffActivityPage.tsx`
Страница с полной лентой активности (для полноэкранного режима)

---

## Механизм записи активностей

### Триггеры в БД (для автоматической записи)

```sql
-- Триггер на chat_messages (отправка сообщений)
CREATE OR REPLACE FUNCTION log_message_sent_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_outgoing = true AND NEW.sender_id IS NOT NULL THEN
    INSERT INTO staff_activity_log (
      organization_id, user_id, user_branch, action_type, action_label,
      target_type, target_id, target_name
    )
    SELECT 
      c.organization_id,
      NEW.sender_id,
      p.branch,
      'message_sent',
      'Отправил сообщение',
      'client',
      c.id,
      c.name
    FROM clients c
    JOIN profiles p ON p.id = NEW.sender_id
    WHERE c.id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Аналогичные триггеры для:
- `tasks` — INSERT/UPDATE (created/completed)
- `invoices` — INSERT
- `leads` — UPDATE status

### Для звонков (self-hosted):
Edge Function `log-call-activity` будет вызываться из `onlinepbx-webhook` после завершения звонка.

---

## Компоненты UI

### Лента активности (StaffActivityFeed)

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 Поиск    [Все филиалы ▼] [Все действия ▼]           │
├─────────────────────────────────────────────────────────┤
│ ● Иван Петров                            сейчас        │
│   📱 Отправил сообщение клиенту Анна Смирнова          │
├─────────────────────────────────────────────────────────┤
│ ● Мария Сидорова                         2 мин назад   │
│   📞 Позвонил клиенту Дмитрий Козлов (3:45)            │
├─────────────────────────────────────────────────────────┤
│ ● Алексей Новиков                        5 мин назад   │
│   ✅ Выполнил задачу: Отправить коммерческое           │
├─────────────────────────────────────────────────────────┤
│ ● Иван Петров                            7 мин назад   │
│   📝 Создал задачу: Перезвонить завтра                 │
├─────────────────────────────────────────────────────────┤
│ ● Мария Сидорова                         12 мин назад  │
│   💰 Выставил счёт на 25 000 ₽                         │
└─────────────────────────────────────────────────────────┘
```

---

## Realtime обновления

Подписка на `staff_activity_log` через Supabase Realtime:
```typescript
supabase
  .channel('staff-activity')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'staff_activity_log',
    filter: `organization_id=eq.${orgId}`
  }, handleNewActivity)
  .subscribe()
```

---

## Интеграция в CRM

### Для управляющего/админа:
1. Новый пункт в меню: "Активность команды"
2. Виджет на дашборде с последними 5 действиями
3. Кнопка "Смотреть полную ленту"

### Фильтрация:
- Управляющий филиала видит только свои филиалы
- Админ видит все филиалы с возможностью фильтрации

---

## Файлы для создания/изменения

| Файл | Действие |
|------|----------|
| `supabase/migrations/xxx_staff_activity_log.sql` | Создать таблицу + триггеры |
| `src/integrations/supabase/database.types.ts` | Добавить типы |
| `src/hooks/useStaffActivityLog.ts` | Создать хук |
| `src/components/crm/StaffActivityFeed.tsx` | Создать компонент ленты |
| `src/components/crm/StaffActivityFilters.tsx` | Создать фильтры |
| `src/pages/crm/StaffActivityPage.tsx` | Создать страницу |
| `src/components/crm/ManagerMenu.tsx` | Добавить пункт меню |

---

## Оптимизация производительности

1. **Индексы** — по organization_id, user_id, branch, created_at
2. **Автоочистка** — удаление записей старше 30 дней (cron job)
3. **Виртуализация** — react-virtual для длинных списков
4. **Пагинация** — бесконечный скролл с limit 50

---

## Ожидаемый результат

- Руководитель видит в реальном времени все действия команды
- Фильтрация по филиалам, сотрудникам и типам действий
- Клик по записи открывает связанную сущность (клиент, задача, счёт)
- Минимальная нагрузка на БД благодаря индексам и автоочистке
