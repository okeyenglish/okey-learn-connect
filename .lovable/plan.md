

## План исправления: Диалоги преподавателей не загружаются

### Диагностика

Выявлена корневая причина проблемы:

1. **Сообщения преподавателей хранятся с `teacher_id`** в таблице `chat_messages` (новая архитектура self-hosted)
2. **Запросы сообщений ищут по `client_id`** (legacy архитектура), когда у преподавателя есть привязанный клиент
3. **Результат**: Запрос возвращает 0 сообщений → UI показывает "Проверка наличия WhatsApp..." вместо диалога

### Техническая причина

В файле `src/components/crm/TeacherChatArea.tsx` строка 109:

```typescript
clientId: teacher.clientId || (conv.lastMessageTime ? `teacher:${teacher.id}` : null),
```

**Проблема**: Приоритет отдаётся `teacher.clientId` (обычный UUID от legacy системы). Маркер `teacher:xxx` используется только когда `clientId` отсутствует.

Когда `ChatArea` получает обычный UUID:
- `isDirectTeacherMessage = false` (не начинается с `teacher:`)
- Используется хук `useTeacherChatMessagesByClientId` который ищет по `client_id`
- Сообщения хранятся с `teacher_id`, не `client_id`
- Запрос возвращает пустой массив

### Решение

Изменить логику в `TeacherChatArea.tsx` чтобы **приоритизировать маркер `teacher:xxx`** когда есть сообщения по `teacher_id`:

```typescript
// Строка 109 - БЫЛО:
clientId: teacher.clientId || (conv.lastMessageTime ? `teacher:${teacher.id}` : null),

// СТАНЕТ:
clientId: conv?.lastMessageTime 
  ? `teacher:${teacher.id}`  // Приоритет: если есть сообщения по teacher_id, используем маркер
  : teacher.clientId || null,  // Fallback: legacy clientId
```

### Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `src/components/crm/TeacherChatArea.tsx` | Изменить логику приоритета clientId на строке 109 |

### Дополнительные проверки

Также нужно убедиться, что:
1. Маркер `teacher:xxx` **не начинается с undefined** когда `teacher.id` отсутствует
2. Логика `resolve()` в useEffect (строки 214-283) корректно обрабатывает оба случая

### Изменения в resolve() функции

Текущая логика:
```typescript
if (teacher.clientId) {
  if (teacher.clientId.startsWith('teacher:')) {
    // Маркер - работает правильно
  }
  // Обычный UUID - использует legacy путь
  setResolvedClientId(teacher.clientId);
  return;
}
```

Эта логика уже правильно обрабатывает маркер `teacher:xxx`, если он передан. Проблема только в том, что маркер не передаётся из-за неправильного приоритета в `teachersWithMessages`.

### Результат после исправления

1. Преподаватели с сообщениями по `teacher_id` получат `clientId = 'teacher:xxx'`
2. `ChatArea` определит `isDirectTeacherMessage = true`
3. Будет использован хук `useTeacherChatMessagesByTeacherId` 
4. Запрос пойдёт по `teacher_id` и вернёт сообщения
5. Диалог загрузится корректно

