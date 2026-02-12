

## Показ последнего актуального (не системного) сообщения в превью

### Проблема

Когда последнее сообщение в чате -- системное (задача, "ответ не требуется", "оплата подтверждена", "crm_system_state_changed"), превью показывает пустую строку или укороченную метку вместо последнего реального сообщения клиента/менеджера.

### Два пути загрузки данных

1. **Direct SQL** (fallback в `useChatThreadsInfinite.ts` и `usePinnedChatThreads.ts`) -- загружает до 10 сообщений на клиента. Можно итерировать и найти первое не-системное.
2. **RPC** (`get_chat_threads_paginated`, `get_chat_threads_optimized`, `get_chat_threads_from_mv`) -- возвращает только одно `last_message_text` с сервера. Фронтенд не может итерировать. Для RPC оставляем краткую метку через `shortenSystemActionPreview`.

### Что будет сделано

**1. `src/hooks/useChatThreadsInfinite.ts` -- функция `fetchThreadsDirectly`**

Вместо `clientMessages[0]` для определения превью -- итерировать по массиву и найти первое сообщение, которое не является системным:

```typescript
// Вместо: const lastMessage = clientMessages[0];
const previewMessage = clientMessages.find(m => {
  const text = m.message_text || '';
  return !isSystemPreviewMessage(text) && !isManagerActionMessage(text);
}) || clientMessages[0];

// lastMessage остаётся clientMessages[0] для времени и messenger_type
const lastMessage = clientMessages[0];
const rawLastMessageText = previewMessage?.message_text || '';
```

Время (`last_message_time`) и тип мессенджера берутся из самого последнего сообщения (`clientMessages[0]`), а текст превью -- из первого не-системного.

**2. `src/hooks/usePinnedChatThreads.ts` -- функция `fetchThreadsDirectly`**

Аналогичная логика: итерировать по `clientMessages` для поиска текста превью, но время и мессенджер брать из `clientMessages[0]`.

**3. Общий хелпер `isManagerActionMessage`**

Добавить во все три файла (или вынести, но для минимальности изменений -- добавить рядом с существующими хелперами):

```typescript
function isManagerActionMessage(text: string): boolean {
  if (!text) return false;
  return /отметил\(а\): ответ не требуется/i.test(text) || 
         /подтвердил\(а\) оплату/i.test(text);
}
```

**4. RPC-путь (без изменений на фронте)**

В `mapRpcToThreads` всех трёх файлов логика остаётся: `shortenSystemActionPreview` заменяет длинный текст на краткую метку ("✓ Ответ не требуется"). Для полного решения на RPC-пути потребуется изменение серверной функции (вне скоупа).

### Результат

- В direct SQL пути (fallback) -- превью показывает последнее реальное сообщение клиента или менеджера
- В RPC пути -- показывается краткая метка вместо длинного системного текста
- Время и мессенджер всегда берутся из самого последнего сообщения (для корректной сортировки)

