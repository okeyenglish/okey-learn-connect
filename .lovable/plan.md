

# План исправления отправки сообщений преподавателям через Telegram/MAX

## Проблема

При отправке сообщения преподавателю через Telegram (Wappi) или MAX (GreenAPI) возникает ошибка "Не удалось отправить сообщение".

**Причина**: Edge Functions `telegram-send` и `max-send` не поддерживают режим отправки по номеру телефона (`phoneNumber`). Они требуют обязательный `clientId` для поиска получателя в базе данных, но для преподавателей мы передаём пустой `clientId` и номер телефона.

## Анализ текущей логики

```text
Фронтенд (ChatArea.tsx):
┌─────────────────────────────────────────────┐
│ isDirectTeacherMessage = true               │
│ effectivePhone = clientPhone (телефон)      │
│                                             │
│ Вызов: sendMaxMessage('', text, options)    │
│ где options = { phoneNumber: effectivePhone }│
└─────────────────────────────────────────────┘
              │
              ▼
Хук (useMaxGreenApi.ts / useTelegramWappi.ts):
┌─────────────────────────────────────────────┐
│ body = { phoneNumber, message, text }       │
│ (если phoneNumber >= 10 цифр)               │
└─────────────────────────────────────────────┘
              │
              ▼
Edge Function (max-send / telegram-send):
┌─────────────────────────────────────────────┐
│ if (!clientId) return error                 │  ← ОШИБКА!
│ // phoneNumber НЕ обрабатывается            │
└─────────────────────────────────────────────┘
```

## Решение

Обновить Edge Functions для поддержки альтернативного режима отправки по `phoneNumber`, когда `clientId` не передан. В этом режиме:

1. Проверка: `clientId` **ИЛИ** `phoneNumber` должен быть указан
2. Нормализация телефона (замена 8→7, добавление префикса 7 для 10-значных номеров)
3. Отправка сообщения напрямую по телефону без записи в `chat_messages` (или запись с `teacher_id`)
4. Опционально: искать `teacherId` по телефону в таблице `teachers` и записывать сообщение

## Изменения

### 1. supabase/functions/max-send/index.ts

Добавить поддержку `phoneNumber`:

```typescript
const { clientId, text, fileUrl, fileName, fileType, phoneId, phoneNumber, teacherId } = body;

// Validate: either clientId or phoneNumber must be provided
if (!clientId && !phoneNumber) {
  return errorResponse('clientId or phoneNumber is required', 400);
}

if (!text && !fileUrl) {
  return errorResponse('text or fileUrl is required', 400);
}

let chatId: string | null = null;
let resolvedTeacherId: string | null = teacherId || null;

// Mode 1: Direct phone number (for teacher messages)
if (phoneNumber && !clientId) {
  const cleanPhone = normalizePhoneForMax(phoneNumber);
  chatId = `${cleanPhone}@c.us`;
  
  // Optionally find teacher by phone
  if (!resolvedTeacherId) {
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .ilike('phone', `%${cleanPhone.slice(-10)}`)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (teacher) resolvedTeacherId = teacher.id;
  }
}
// Mode 2: Client lookup (existing logic)
else if (clientId) {
  // ... existing client lookup logic
}
```

Сохранение с `teacher_id`:

```typescript
.insert({
  client_id: clientId || null,
  teacher_id: resolvedTeacherId || null,
  organization_id: organizationId,
  // ... остальные поля
})
```

### 2. supabase/functions/telegram-send/index.ts

Аналогичные изменения для Telegram:

```typescript
const { clientId, text, fileUrl, fileName, fileType, phoneId, phoneNumber, teacherId } = body;

// Validate: either clientId or phoneNumber
if (!clientId && !phoneNumber) {
  return errorResponse('clientId or phoneNumber is required', 400);
}

let recipient: string | null = null;
let resolvedTeacherId: string | null = teacherId || null;

// Mode 1: Direct phone number
if (phoneNumber && !clientId) {
  recipient = normalizePhone(phoneNumber);
  
  // Find teacher by phone
  if (!resolvedTeacherId) {
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .ilike('phone', `%${recipient.slice(-10)}`)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (teacher) resolvedTeacherId = teacher.id;
  }
}
// Mode 2: Client lookup
else if (clientId) {
  // ... existing lookup logic
}
```

### 3. Обновление хуков (уже сделано ранее)

Хуки `useMaxGreenApi.ts` и `useTelegramWappi.ts` уже передают `phoneNumber` в body — это правильно.

### 4. Передача teacherId с фронтенда

В `ChatArea.tsx` добавить `teacherId` в options для более надёжной записи:

```typescript
const maxOptions = effectivePhone 
  ? { phoneNumber: effectivePhone, teacherId: actualTeacherId } 
  : undefined;
```

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `supabase/functions/max-send/index.ts` | Добавить режим отправки по `phoneNumber`, поиск `teacherId`, сохранение с `teacher_id` |
| `supabase/functions/telegram-send/index.ts` | Добавить режим отправки по `phoneNumber`, поиск `teacherId`, сохранение с `teacher_id` |
| `src/hooks/useMaxGreenApi.ts` | Добавить передачу `teacherId` в body |
| `src/hooks/useTelegramWappi.ts` | Добавить передачу `teacherId` в body |
| `src/components/crm/ChatArea.tsx` | Передавать `teacherId` в options для MAX и Telegram |

## Важно

После внесения изменений необходимо:
1. Задеплоить обновлённые Edge Functions на self-hosted сервер (`api.academyos.ru`)
2. Проверить отправку сообщения преподавателю через Telegram и MAX

