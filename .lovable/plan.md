
# План: Кнопка логов активности с разделением по ролям

## Логика доступа

| Роль | Что видит |
|------|-----------|
| admin, branch_manager | Логи всех сотрудников (с фильтрами) |
| manager, teacher, methodist | Только свои логи |

---

## Изменения

### 1. Обновить `StaffActivityFeed.tsx`

Добавить prop `userId` для фильтрации по конкретному пользователю:

```typescript
interface StaffActivityFeedProps {
  compact?: boolean;
  limit?: number;
  showFilters?: boolean;
  showHeader?: boolean;
  className?: string;
  userId?: string; // <-- добавить
}
```

И передать в хук:
```typescript
const { activities, isLoading, refetch } = useStaffActivityLog({
  branches: selectedBranches,
  actionTypes: selectedActionTypes,
  userId, // <-- передать
  limit: compact ? 5 : limit,
});
```

### 2. Создать `StaffActivityPopover.tsx`

Новый компонент с Popover:
- Иконка Activity рядом с виджетом статистики
- При клике открывается/закрывается панель
- Определяет режим по роли пользователя:
  - Руководители (admin, branch_manager) → все логи
  - Остальные → только свои (`userId: user.id`)

```typescript
export function StaffActivityPopover() {
  const [open, setOpen] = useState(false);
  const { user, roles } = useAuth();
  
  const isManager = roles?.some(r => ['admin', 'branch_manager'].includes(r));
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <Activity className={cn("h-4 w-4", open && "text-primary")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="end">
        <StaffActivityFeed
          compact
          showHeader
          showFilters={false}
          userId={isManager ? undefined : user?.id}
        />
      </PopoverContent>
    </Popover>
  );
}
```

### 3. Обновить `UnifiedCRMHeader.tsx`

Добавить StaffActivityPopover между StaffActivityIndicator и аватаром:

```typescript
{/* Activity Popover - visible for all staff */}
{hasAnyRole(['admin', 'manager', 'methodist', 'teacher', 'branch_manager']) && (
  <StaffActivityPopover />
)}
```

---

## Визуальное расположение

```
┌─────────────────────────────────────────────────────────────────┐
│  ● 28м │ 📞 0 │ 💬 0 │ ⚡88%  [📋]  ДП  Даниил Пышнов  ▼       │
│                               ↑                                 │
│                         Иконка логов                            │
└─────────────────────────────────────────────────────────────────┘
```

При нажатии для менеджера (свои логи):
```
┌─────────────────────────────────────────┐
│ 📋 Мои действия                   [🔄] │
├─────────────────────────────────────────┤
│ ● Вы                       2 мин назад │
│   📱 Отправили сообщение клиенту       │
├─────────────────────────────────────────┤
│ ● Вы                       5 мин назад │
│   📞 Позвонили клиенту (3:45)          │
└─────────────────────────────────────────┘
```

При нажатии для admin/branch_manager:
```
┌─────────────────────────────────────────┐
│ 📋 Активность команды             [🔄] │
├─────────────────────────────────────────┤
│ ● Иван Петров              2 мин назад │
│   📱 Отправил сообщение клиенту        │
├─────────────────────────────────────────┤
│ ● Мария Сидорова           5 мин назад │
│   📞 Позвонила клиенту (3:45)          │
└─────────────────────────────────────────┘
```

---

## Файлы

| Файл | Действие |
|------|----------|
| `src/components/crm/StaffActivityPopover.tsx` | Создать |
| `src/components/crm/staff-activity/StaffActivityFeed.tsx` | Добавить prop userId |
| `src/components/crm/UnifiedCRMHeader.tsx` | Добавить StaffActivityPopover |

---

## Результат
- Иконка логов рядом с виджетом статистики для всех сотрудников
- Руководители видят логи всей команды
- Обычные сотрудники видят только свои действия
- Toggle открытие/закрытие по клику
