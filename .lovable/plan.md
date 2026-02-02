
# План: Исправление видимости онлайн-статуса и скрытие переключателя

## Проблема 1: Пользователи не видят друг друга онлайн

### Причина
Канал присутствия (`staff-online-presence`) глобальный и не привязан к организации. Нужно добавить фильтрацию по `organization_id`.

### Решение
1. Изменить имя канала на организационное: `staff-online-presence-{organizationId}`
2. При обработке событий sync проверять, что пользователи из одной организации
3. Добавить трекинг `organization_id` в payload присутствия

### Файл: `src/hooks/useStaffOnlinePresence.ts`
```text
// Было:
const PRESENCE_ROOM = 'staff-online-presence';

// Станет:
const PRESENCE_ROOM_PREFIX = 'staff-online-presence';
// Канал: `staff-online-presence-${profile.organization_id}`
```

### Изменения в buildPresencePayload:
```text
const buildPresencePayload = () => ({
  id: user.id,
  name: userName,
  avatarUrl,
  branch: userBranch,
  organizationId: profile.organization_id, // НОВОЕ
  lastSeen: Date.now(),
  isOnline: true,
  ...extendedPayloadRef.current,
});
```

---

## Проблема 2: Переключатель "Все/Онлайн" виден при раскрытых секциях

### Причина
Переключатель всегда показывается в секции "Сотрудники и группы", даже когда раскрыты "AI Помощники" или "Сообщества".

### Решение
Скрыть переключатель когда `aiSectionExpanded` или `communitiesSectionExpanded` равны `true`.

### Файл: `src/components/ai-hub/AIHub.tsx` (строки ~1060-1085)
```text
// Добавить условие:
const showStaffFilter = !aiSectionExpanded && !communitiesSectionExpanded;

// В разметке:
{showStaffFilter && (
  <div className="flex items-center bg-muted rounded-md p-0.5">
    ...переключатель...
  </div>
)}
```

---

## Технические детали

### Файлы для изменения
| Файл | Изменение |
|------|-----------|
| `src/hooks/useStaffOnlinePresence.ts` | Добавить организационную изоляцию канала |
| `src/components/ai-hub/AIHub.tsx` | Скрыть переключатель при раскрытых секциях |

### Шаги реализации

1. **useStaffOnlinePresence.ts**:
   - Получить `organization_id` из профиля
   - Создать канал с суффиксом организации
   - Добавить `organizationId` в payload
   - Фильтровать пользователей по организации при sync

2. **AIHub.tsx**:
   - Добавить переменную `showStaffFilter`
   - Обернуть toggle в условный рендеринг

### Ожидаемый результат
- Все сотрудники одной организации видят друг друга онлайн
- Сотрудники разных организаций изолированы
- Переключатель скрыт когда раскрыты AI/Сообщества секции
