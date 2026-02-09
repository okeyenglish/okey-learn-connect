
# UI-улучшения для чатов сотрудников и групповых чатов

## Задача 1: Ограничить отображение филиалов до 2, остальные по наведению

**Проблема**: У сотрудников с несколькими филиалами (например, "Окская, Новокосино, Котельники, Грайвороновская, ONLINE") бейдж филиала занимает всю строку и обрезается.

**Решение**: В обоих файлах (`AIHub.tsx` и `AIHubInline.tsx`) в секции рендеринга сотрудников/преподавателей:
- Если `branch` содержит запятые (несколько филиалов), разбить на массив
- Показать максимум 2 бейджа
- Если филиалов больше 2, показать "+N" бейдж с `title` (тултип при наведении), содержащим полный список

**Файлы**: `src/components/ai-hub/AIHub.tsx` (строки 1127-1136), `src/components/ai-hub/AIHubInline.tsx` (строки 1218-1228)

## Задача 2: Показывать превью последнего сообщения в списке сотрудников

**Проблема**: В `AIHub.tsx` не подключены `staffPreviews` (в отличие от `AIHubInline.tsx`), поэтому `lastMessage` всегда пустой для сотрудников.

**Решение**: В `AIHub.tsx`:
- Подключить `useStaffConversationPreviews` (уже импортирован, но не используется)
- Добавить `lastMessage` и `lastMessageTime` из `staffPreviews` в `teacherChatItems` и `staffChatItems` (по аналогии с `AIHubInline.tsx`)

**Файл**: `src/components/ai-hub/AIHub.tsx` (строки 294-326)

## Задача 3: Показать групповые чаты филиалов с непрочитанными

**Проблема**: Группы (чаты филиалов) скрыты при фильтре "Онлайн" (`return false; // Groups are excluded when filtering online`). Нет превью последнего сообщения и непрочитанных для групп.

**Решение**:
1. Изменить фильтр `corporateChatsListFiltered` в обоих файлах: группы всегда показывать (не скрывать при фильтре "Онлайн")
2. Добавить подсчёт непрочитанных для групп из `useStaffGroupMessages` или новый хук `useStaffGroupPreviews`
3. Добавить превью последнего сообщения для групповых чатов

**Подход к непрочитанным для групп**: Создать новый хук `useStaffGroupChatPreviews` в `useInternalStaffMessages.ts`, который для каждого `group_chat_id` загружает:
- Последнее сообщение (message_text, created_at, sender first_name)
- Количество непрочитанных (is_read = false, sender_id != user.id)

**Файлы**:
- `src/hooks/useInternalStaffMessages.ts` — новый хук `useStaffGroupChatPreviews`
- `src/components/ai-hub/AIHub.tsx` — подключить хук, передать данные в `groupChatItems`, показать группы при фильтре "Онлайн"
- `src/components/ai-hub/AIHubInline.tsx` — аналогично

## Задача 4: Возможность переименовать чат

**Проблема**: Нет функциональности переименования групповых чатов.

**Решение**:
1. Добавить мутацию `useRenameStaffGroupChat` в `useStaffGroupChats.ts` — вызывает `selfHostedPost('update-staff-group-chat', { group_id, name })`
2. В header чата (когда открыт групповой чат) добавить кнопку редактирования (иконка карандаша) рядом с названием
3. По клику — показать инлайн-редактор (Input вместо текста) с кнопками сохранить/отменить
4. Если edge function `update-staff-group-chat` не существует, создать её

**Файлы**:
- `supabase/functions/update-staff-group-chat/index.ts` — новая edge function (или `selfHostedPost` если таблица на self-hosted)
- `src/hooks/useStaffGroupChats.ts` — новый хук `useRenameStaffGroupChat`
- `src/components/ai-hub/AIHub.tsx` и `AIHubInline.tsx` — UI для переименования в header чата

## Технические детали

### Новый хук: `useStaffGroupChatPreviews`
```typescript
export const useStaffGroupChatPreviews = (groupIds: string[]) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['staff-group-previews', groupIds],
    queryFn: async () => {
      // Для каждого groupId:
      // 1. Последнее сообщение из internal_staff_messages WHERE group_chat_id = groupId
      // 2. COUNT непрочитанных WHERE group_chat_id = groupId AND is_read = false AND sender_id != user.id
    },
    enabled: !!user?.id && groupIds.length > 0,
    staleTime: 30000,
  });
};
```

### Логика показа филиалов (max 2)
```typescript
const branches = (staff?.branch || '').split(',').map(b => b.trim()).filter(Boolean);
const visibleBranches = branches.slice(0, 2);
const hiddenCount = branches.length - visibleBranches.length;

// Рендер:
{visibleBranches.map(b => <Badge key={b}>{b}</Badge>)}
{hiddenCount > 0 && (
  <Badge title={branches.join(', ')}>+{hiddenCount}</Badge>
)}
```

### Переименование чата (self-hosted)
Поскольку `staff_group_chats` на self-hosted базе, используем `selfHostedPost`:
```typescript
const response = await selfHostedPost('update-staff-group-chat', {
  group_id: groupId,
  name: newName,
});
```
Нужно будет создать edge function `update-staff-group-chat` на self-hosted, или обновлять через прямой запрос к Supabase если таблица доступна.

### Группы при фильтре "Онлайн"
Изменить строку `return false; // Groups are excluded` на `return true;` чтобы группы всегда отображались.

## Порядок реализации
1. Создать `useStaffGroupChatPreviews` хук
2. Обновить `groupChatItems` в обоих файлах с превью и непрочитанными
3. Исправить фильтр "Онлайн" для групп
4. Реализовать ограничение филиалов до 2
5. Добавить мутацию переименования и UI в header чата
6. Синхронизировать `AIHub.tsx` с `AIHubInline.tsx` по превью сообщений
