
# План исправления: Синхронизация источника данных для чатов между мобильной и десктоп версиями

## Проблема

На мобильной версии чаты отображаются корректно (показано 23 сотрудника/группы), а на десктопной версии — пустой список (191 запись показывается только по онлайн-фильтру, но групповые чаты отсутствуют).

### Причина

Два компонента используют **разные источники данных**:

| Компонент | Хук | Источник данных |
|-----------|-----|-----------------|
| `AIHubInline` (мобильная) | `useStaffGroupChats()` | Таблица `staff_group_chats` через self-hosted API |
| `AIHub` (десктоп) | `useInternalChats()` | Таблица `clients` (поиск по "Внутренний чат", "Корпоративный чат") |

Хук `useInternalChats` — это устаревшая реализация, которая искала чаты среди обычных клиентов по ключевым словам в имени. Современные групповые чаты сотрудников хранятся в `staff_group_chats`.

## Решение

Заменить использование `useInternalChats` на `useStaffGroupChats` в десктопной версии (`AIHub.tsx`), чтобы оба компонента получали данные из одного источника.

## Файлы для изменения

1. `src/components/ai-hub/AIHub.tsx`

## Детали изменений

### 1. Заменить импорт хука

**Было:**
```typescript
import { useInternalChats, InternalChat } from '@/hooks/useInternalChats';
```

**Станет:**
```typescript
import { useStaffGroupChats, StaffGroupChat } from '@/hooks/useStaffGroupChats';
```

### 2. Заменить вызов хука

**Было:**
```typescript
const { data: internalChats, isLoading: chatsLoading } = useInternalChats();
```

**Станет:**
```typescript
const { data: staffGroupChats, isLoading: groupChatsLoading } = useStaffGroupChats();
```

### 3. Обновить формирование списка групповых чатов

**Было (строки 280-290):**
```typescript
// Group chats from internal_chats
const groupChatItems: ChatItem[] = (internalChats || []).map(group => ({
  id: group.id,
  type: 'group' as ChatType,
  name: group.name,
  description: group.description || group.branch || 'Групповой чат',
  icon: Users,
  iconBg: 'bg-blue-500/10',
  iconColor: 'text-blue-600',
  data: group,
}));
```

**Станет (идентично AIHubInline):**
```typescript
// Staff group chats (unified: branch groups + custom groups)
const groupChatItems: ChatItem[] = (staffGroupChats || []).map(group => ({
  id: group.id, 
  type: 'group' as ChatType, 
  name: group.name, 
  description: group.description || (group.is_branch_group ? `Команда ${group.branch_name}` : 'Групповой чат'), 
  icon: Users, 
  iconBg: group.is_branch_group ? 'bg-indigo-500/10' : 'bg-blue-500/10', 
  iconColor: group.is_branch_group ? 'text-indigo-600' : 'text-blue-600',
  badge: group.branch_name || undefined,
  data: group,
}));
```

### 4. Обновить условие загрузки

Заменить `chatsLoading` на `groupChatsLoading` в проверках состояния загрузки.

### 5. Добавить получение previews для сотрудников (опционально)

Для полного паритета с мобильной версией, добавить получение превью сообщений:

```typescript
// Get all profile IDs for staff conversation previews
const teacherProfileIds = teachers
  .filter(t => t.profileId)
  .map(t => t.profileId as string);
const staffMemberIds = (staffMembers || []).map(s => s.id);
const allProfileIds = [...new Set([...teacherProfileIds, ...staffMemberIds])];
const { data: staffPreviews } = useStaffConversationPreviews(allProfileIds);
```

## Сравнение после исправления

| Параметр | Мобильная | Десктоп (после) |
|----------|-----------|-----------------|
| Источник групп | `staff_group_chats` | `staff_group_chats` |
| Источник сотрудников | `profiles` + `staffMembers` | `profiles` + `staffMembers` |
| Хук групп | `useStaffGroupChats` | `useStaffGroupChats` |
| API | self-hosted | self-hosted |

## Ожидаемый результат

После изменений:
- Десктоп версия будет показывать те же групповые чаты ("Команда Котельники", "Команда Мытищи" и т.д.)
- Список сотрудников и групп будет идентичен на обеих платформах
- Счётчик "Все N" будет показывать одинаковое количество

## Риски

- Минимальные: изменяется только источник данных, логика отображения остаётся прежней
- `useStaffGroupChats` уже проверен в мобильной версии

## Дополнительно

После этого исправления можно будет удалить неиспользуемый хук `useInternalChats`, если он больше нигде не применяется.
