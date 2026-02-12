
## Моментальное открытие правильной вкладки мессенджера

### Проблема

При клике на чат в списке вкладка мессенджера (WhatsApp/Telegram/Max) определяется только **после загрузки всех сообщений**. ChatArea ждет завершения запросов `unreadLoading`, `unreadFetching` и `loadingMessages`, и только потом выбирает вкладку по последнему сообщению. Это создает задержку ~1 секунду, во время которой пользователь видит пустую или неправильную вкладку.

### Решение

Список чатов уже содержит информацию о мессенджере последнего сообщения (`last_message_messenger`) и последнего непрочитанного (`last_unread_messenger`). Нужно передавать эту информацию при клике, чтобы ChatArea мог **мгновенно** установить правильную вкладку без ожидания загрузки сообщений.

### Технические детали

**1. Файл: `src/components/crm/VirtualizedChatList.tsx`**

В `onChatClick` вызове (строка ~258) -- передавать мессенджер из данных чата, даже если это не результат поиска:

```text
// Было:
const messengerType = foundInMessages && getMessengerType ? getMessengerType(chat.id) : null;

// Будет:
const messengerType = foundInMessages && getMessengerType 
  ? getMessengerType(chat.id) 
  : (chat.last_unread_messenger || chat.last_message_messenger || null);
```

**2. Файл: `src/pages/CRM.tsx`**

В `handleChatClick` (строка ~1475) -- всегда устанавливать `selectedMessengerTab`, если передан `messengerType`, а не только при `foundInMessages`:

```text
// Было (строки ~1493-1506): messengerTab устанавливается только для foundInMessages

// Будет: если messengerType передан -- устанавливаем вкладку сразу
if (messengerType) {
  setSelectedMessengerTab({ tab: messengerType, ts: Date.now() });
  setTimeout(() => setSelectedMessengerTab(undefined), 500);
}
```

**3. Файл: `src/pages/CRM.tsx`**

В inline-рендере ChatListItem (строка ~3718) -- аналогично передавать мессенджер из данных чата:

```text
// Было:
const messengerType = foundInMessages && getMessengerType ? getMessengerType(chat.id) : null;

// Будет:
const messengerType = foundInMessages && getMessengerType 
  ? getMessengerType(chat.id)
  : (chat.last_unread_messenger || chat.last_message_messenger || null);
```

**4. Файл: `src/components/crm/ChatArea.tsx`**

В useEffect для начальной вкладки (строки ~729-769) -- если `initialMessengerTab` передан, устанавливать его **немедленно**, не дожидаясь загрузки сообщений:

```text
// Добавить ранний выход: если вкладка уже передана из списка -- применить сразу
if (initialMessengerTab && initialTabSet !== clientId) {
  setActiveMessengerTab(initialMessengerTab);
  setInitialTabSet(clientId);
  return; // Не ждем загрузки сообщений
}
```

### Результат

Вместо ожидания ~1с загрузки сообщений для определения вкладки, правильная вкладка устанавливается **мгновенно** при клике на чат из списка. Если данные о мессенджере отсутствуют в списке (редкий случай), сохраняется текущая логика определения по загруженным сообщениям.
