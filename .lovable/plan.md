
# UI-улучшения для чатов сотрудников и групповых чатов (часть 2)

## Проблема 1: Build error
Необходимо проверить и исправить ошибки сборки, оставшиеся после предыдущих изменений. Возможно неиспользуемый импорт `Building2` или другие проблемы.

## Проблема 2: Email вместо должности в превью
Сейчас под именем сотрудника отображается email. Нужно заменить на должность: "Преподаватель" для `teacher`, "Сотрудник" для `staff`. Если есть превью последнего сообщения -- показывать его вместо должности.

**Файлы**: `src/components/ai-hub/AIHub.tsx`, `src/components/ai-hub/AIHubInline.tsx`

В маппинге `teacherChatItems`:
```
description: 'Преподаватель'  // вместо teacher.email
```

В маппинге `staffChatItems`:
```
description: 'Сотрудник'  // вместо staff.email
```

## Проблема 3: 1-2 филиала рядом с именем + тултип
Рядом с именем в строке (не под именем) показывать 1-2 бейджа филиалов. При наведении на "+N" бейдж -- показывать полный список.

В рендеринге списка чатов для `teacher`/`staff`:
```typescript
const branches = (isTeacher ? teacher?.branch : staff?.branch || '').split(',').map(b => b.trim()).filter(Boolean);
const visibleBranches = branches.slice(0, 2);
const hiddenCount = branches.length - 2;
```

Добавить бейджи в строку имени (справа от имени):
```tsx
{visibleBranches.map(b => (
  <Badge key={b} variant="secondary" className="text-[9px] h-3.5 px-1 shrink-0">{b}</Badge>
))}
{hiddenCount > 0 && (
  <Badge variant="outline" className="text-[9px] h-3.5 px-1 shrink-0 cursor-help" title={branches.join(', ')}>
    +{hiddenCount}
  </Badge>
)}
```

## Проблема 4: Ошибки при удалении и переименовании чатов
Ошибки связаны с тем, что edge-функции `update-staff-group-chat` и `delete-staff-group-chat` не существуют на self-hosted. Нужно создать их.

### Edge Function: `update-staff-group-chat`
Принимает `group_id` и `name`, обновляет `staff_group_chats.name` через service role key.

### Edge Function: `delete-staff-group-chat`
Принимает `group_id`, удаляет все `staff_group_chat_members` и `internal_staff_messages` с этим `group_chat_id`, затем удаляет сам `staff_group_chats` записm.

## Проблема 5: Показать участников группового чата в header
В header группового чата (под названием) показывать имена участников.

Подключить `useStaffGroupMembers(activeChat.id)` в обоих файлах и отобразить список имен в подзаголовке:

```tsx
const groupMembers = useStaffGroupMembers(activeChat?.type === 'group' ? activeChat.id : '');

// В header вместо activeChat.badge || activeChat.description:
{activeChat.type === 'group' && groupMembers.data?.length ? (
  <p className="text-xs text-muted-foreground truncate">
    {groupMembers.data.map(m => m.profile?.first_name || 'Участник').join(', ')}
  </p>
) : (
  <p className="text-xs text-muted-foreground truncate">{activeChat.description}</p>
)}
```

## Порядок реализации
1. Создать edge functions `update-staff-group-chat` и `delete-staff-group-chat`
2. Исправить `description` для `teacher`/`staff` (должность вместо email)
3. Добавить бейджи филиалов рядом с именем
4. Подключить `useStaffGroupMembers` в header группового чата
5. Убрать неиспользуемый импорт `Building2` если он вызывает ошибку
