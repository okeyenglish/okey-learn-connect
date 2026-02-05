
## Исправление: Реализация удаления чата преподавателя

На скриншоте видно, что при попытке удалить преподавателя "Дан Иил" появляется тост "Функция удаления в разработке". Сейчас функция `handleDeleteChat` в `TeacherChatArea.tsx` просто показывает этот тост вместо реального действия.

### Что будет сделано

Реализую полноценное удаление (деактивацию) преподавателей:

1. **Диалог подтверждения** - перед удалением покажется окно с запросом подтверждения
2. **Мягкое удаление** - преподаватель деактивируется (`is_active = false`), но не удаляется из базы
3. **Обновление списка** - после удаления список преподавателей обновится автоматически

### Изменения в файле

**Файл:** `src/components/crm/TeacherChatArea.tsx`

| Изменение | Описание |
|-----------|----------|
| Импорт | Добавить `DeleteChatDialog` и `useQueryClient` |
| Состояние | Добавить `deleteTeacherDialog` и `isDeletingTeacher` |
| handleDeleteChat | Находит имя преподавателя и открывает диалог подтверждения |
| confirmDeleteTeacher | Выполняет `UPDATE teachers SET is_active = false` |
| JSX | Добавить компонент `DeleteChatDialog` в конец |

### Технические детали

```text
Строка ~360-366 (до):
const handleDeleteChat = useCallback((teacherId: string) => {
  toast({
    title: "Удаление чата",
    description: "Функция удаления в разработке",
    variant: "destructive",
  });
}, [toast]);

Строка ~360-380 (после):
const handleDeleteChat = useCallback((teacherId: string) => {
  const teacher = dbTeachers?.find(t => t.id === teacherId);
  const teacherName = teacher 
    ? `${teacher.last_name || ''} ${teacher.first_name || ''}`.trim() || 'Преподаватель'
    : 'Преподаватель';
  setDeleteTeacherDialog({ open: true, teacherId, teacherName });
}, [dbTeachers]);

// + confirmDeleteTeacher:
const confirmDeleteTeacher = useCallback(async () => {
  if (!deleteTeacherDialog.teacherId) return;
  setIsDeletingTeacher(true);
  try {
    const { error } = await supabase
      .from('teachers')
      .update({ is_active: false })
      .eq('id', deleteTeacherDialog.teacherId);
    if (error) throw error;
    
    queryClient.invalidateQueries({ queryKey: ['teacher-chats'] });
    queryClient.invalidateQueries({ queryKey: ['teachers'] });
    
    if (selectedTeacherId === deleteTeacherDialog.teacherId) {
      onSelectTeacher(null);
    }
    setDeleteTeacherDialog({ open: false, teacherId: '', teacherName: '' });
    toast.success(`Преподаватель "${deleteTeacherDialog.teacherName}" деактивирован`);
  } catch (error) {
    console.error('Error deactivating teacher:', error);
    toast.error('Не удалось деактивировать преподавателя');
  } finally {
    setIsDeletingTeacher(false);
  }
}, [deleteTeacherDialog, selectedTeacherId, onSelectTeacher, queryClient]);
```

### Поведение после реализации

1. Нажатие "Удалить" в контекстном меню преподавателя → открывается диалог подтверждения
2. Нажатие "Удалить" в диалоге → преподаватель деактивируется в базе
3. Преподаватель исчезает из списка активных
4. Данные сохраняются для истории (уроки, сообщения и т.д.)
5. При необходимости можно восстановить через админ-панель (установить `is_active = true`)
