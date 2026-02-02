
# План: Исправление краша при клике на диалог в AI Hub

## Причина проблемы

Функция `handleSelectChat` в `AIHub.tsx` (строка 465) является асинхронной, но **не имеет блока try-catch**. Когда вызывается `findOrCreateClient(teacher)` и происходит ошибка (например, ошибка Supabase), Promise rejection не обрабатывается, что приводит к краху всего React-приложения (белый экран).

```text
// Текущий проблемный код (строки 465-481):
const handleSelectChat = async (item: ChatItem) => {
  if (item.type === 'teacher' && item.data) {
    const teacher = item.data as TeacherChatItem;
    if (!teacher.profileId) {
      toast.error('...');
      return;
    }
    if (teacher.clientId) {
      setTeacherClientId(teacher.clientId);
    } else {
      const clientId = await findOrCreateClient(teacher); // <-- ОШИБКА ЗДЕСЬ КРАШИТ ВСЁ
      setTeacherClientId(clientId);
    }
  }
  setActiveChat(item); // <-- Если выше была ошибка, это не выполнится
};
```

## Решение

Обернуть всё тело функции `handleSelectChat` в блок `try-catch` с выводом toast об ошибке.

```text
const handleSelectChat = async (item: ChatItem) => {
  try {
    // Check if teacher has profile link before opening chat
    if (item.type === 'teacher' && item.data) {
      const teacher = item.data as TeacherChatItem;
      if (!teacher.profileId) {
        toast.error('У преподавателя не привязан профиль...');
        return;
      }
      if (teacher.clientId) {
        setTeacherClientId(teacher.clientId);
      } else {
        const clientId = await findOrCreateClient(teacher);
        setTeacherClientId(clientId);
      }
    }
    setActiveChat(item);
  } catch (error) {
    console.error('[AIHub] Error selecting chat:', error);
    toast.error('Не удалось открыть чат. Попробуйте ещё раз.');
  }
};
```

---

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `src/components/ai-hub/AIHub.tsx` | Добавить try-catch в `handleSelectChat` (строки 465-481) |

---

## Технические детали

### Почему это работает

1. **React Error Boundaries не ловят async-ошибки** — только ошибки в рендере и lifecycle методах
2. **Unhandled promise rejections** вызывают краш приложения
3. Обёртка в `try-catch` перехватывает любые ошибки и показывает пользователю понятное сообщение вместо белого экрана

### Ожидаемый результат

- При клике на любой диалог (сотрудник, преподаватель, AI-помощник) приложение не крашится
- Если возникает ошибка (например, сетевая), пользователь видит toast "Не удалось открыть чат"
- Приложение остаётся работоспособным
