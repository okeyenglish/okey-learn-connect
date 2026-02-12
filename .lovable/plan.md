
## Разделение CRM-чатов преподавателей и внутренней переписки в AI Hub

### Проблема

Сейчас в AI Hub (ChatOS) список чатов с преподавателями показывает данные из CRM-переписки (таблица `chat_messages`) -- это сообщения, отправленные преподавателям от имени компании через мессенджеры (Telegram, WhatsApp и т.д.). Но AI Hub -- это внутренний чат, где менеджеры общаются от своего имени. Поэтому превью и счетчики непрочитанных должны браться только из таблицы `internal_staff_messages`.

### Решение

Убрать фолбэк на CRM-данные в списке преподавателей AI Hub. Показывать только данные из внутренней переписки (`staffPreviews`).

### Технические изменения

**Файл: `src/components/ai-hub/AIHub.tsx`** (строки ~360-377)

Текущий код:
```typescript
unreadCount: preview?.unreadCount || teacher.unreadMessages,
lastMessage: preview?.lastMessage || teacher.lastMessageText || undefined,
lastMessageTime: preview?.lastMessageTime || undefined,
```

Нужно убрать фолбэк на `teacher.unreadMessages` и `teacher.lastMessageText`:
```typescript
unreadCount: preview?.unreadCount || 0,
lastMessage: preview?.lastMessage || undefined,
lastMessageTime: preview?.lastMessageTime || undefined,
```

Это единственное изменение. Теперь:
- Если есть внутренняя переписка с преподавателем -- показывается последнее сообщение из `internal_staff_messages`
- Если внутренней переписки нет -- превью пустое (без текста CRM-сообщений от имени компании)
- Счетчик непрочитанных считает только внутренние сообщения
