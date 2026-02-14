
## Пересылка сообщений клиентам, преподавателям и в ChatOS клиента

### Что будет сделано

Расширение модального окна пересылки (`ForwardMessageModal`) для отправки сообщений:
- **Сотрудникам / группам** (текущее поведение, без изменений)
- **Клиентам** — через WhatsApp, Telegram, MAX или ChatOS
- **Преподавателям** — через WhatsApp, Telegram, MAX

### UX-поток

1. Пользователь выбирает сообщение(я) и нажимает "Переслать"
2. В модальном окне **4 таба**: Сотрудники | Клиенты | Преподаватели | (поиск работает в каждом)
3. При выборе клиента/преподавателя появляется **шаг выбора мессенджера** (WhatsApp / Telegram / MAX / ChatOS для клиентов) -- показываются только активные интеграции
4. Нажимает "Переслать"

### Что видит каждая сторона

| Получатель | Что видит сотрудник в CRM | Что получает получатель |
|---|---|---|
| Сотрудник/группа ChatOS | Бабл пересылки с указанием откуда (как сейчас) | Бабл пересылки с кликабельной ссылкой на чат |
| Клиент (мессенджер) | Бабл пересылки: "Переслано из диалога с X" + кликабельная ссылка на исходное сообщение | Обычное текстовое сообщение (без разметки) |
| Клиент (ChatOS) | Бабл пересылки аналогично мессенджеру | Обычное текстовое сообщение в ChatOS |
| Преподаватель | Бабл пересылки аналогично | Обычное текстовое сообщение |

### Технические детали

#### 1. Новый файл: `src/hooks/useForwardRecipients.ts`
Хук для поиска клиентов и преподавателей:
- Клиенты: запрос к `clients` с поиском по `name`, `phone`, `first_name`, `last_name`
- Преподаватели: запрос к `teachers` с поиском по `first_name`, `last_name`, `phone`
- Дебаунс поиска 300мс, лимит 50 результатов

#### 2. Переработка `src/components/crm/ForwardMessageModal.tsx`
- Добавить `Tabs` с 3 табами: "Сотрудники", "Клиенты", "Преподаватели"
- Расширить `RecipientType` на `'staff' | 'group' | 'client' | 'teacher'`
- Добавить поле `messengerType?: 'whatsapp' | 'telegram' | 'max' | 'chatos'` в `Recipient`
- При выборе клиента/преподавателя -- показать выбор мессенджера (используя `useAllIntegrationsStatus` для доступных каналов + ChatOS для клиентов)
- Кнопка "Переслать" отключена пока не выбран и получатель, и мессенджер

#### 3. Логика отправки в `handleSend`

**Для staff/group** -- без изменений: `useSendStaffMessage` с форматом `[forwarded_from:...]`

**Для client (мессенджер WhatsApp/Telegram/MAX)**:
1. Сохранить в `chat_messages` с `message_type: 'forwarded_message'` и полным форматом `[forwarded_from:...]` -- это то, что увидит сотрудник в CRM
2. Отправить в мессенджер через `selfHostedPost('whatsapp-send' / 'telegram-send' / 'max-send')` только чистый текст сообщения (без разметки `[forwarded_from:...]`)

**Для client (ChatOS)**:
1. Сохранить в `chat_messages` с `messenger_type: 'chatos'`, `message_type: 'forwarded_message'` и полным форматом -- для сотрудника в CRM
2. Дополнительно отправить обычное сообщение в ChatOS клиента (чистый текст) через `useSendChatOSMessage`

**Для teacher**:
1. Сохранить запись с `message_type: 'forwarded_message'` и полным форматом для отображения в CRM
2. Отправить чистый текст через соответствующий мессенджер

#### 4. Отображение пересылки в CRM-чате клиента/преподавателя

В `src/components/crm/ChatMessage.tsx` уже есть поддержка `isForwarded`, `forwardedFrom`, `forwardedFromType`. Нужно:
- Добавить обработку `message_type === 'forwarded_message'` при маппинге сообщений в `ChatArea.tsx` -- парсить `[forwarded_from:clientId:messageId]` из текста
- Сделать бабл кликабельным: клик переходит к исходному чату и сообщению (используя существующие `onOpenChat` / навигацию)
- Добавить `forwardedFromClientId` и `forwardedFromMessageId` в пропсы `ChatMessage` для навигации

#### 5. Обновление `src/components/crm/ChatArea.tsx`
- При рендере сообщений проверять `message_type === 'forwarded_message'` и парсить метаданные `[forwarded_from:...]`
- Передавать `isForwarded`, `forwardedFrom`, `forwardedFromType` в `ChatMessage`
- Добавить обработчик клика по пересылке для навигации к исходному сообщению
- Обновить типы `onForward` / `onSent` для поддержки расширенных `RecipientType`

#### 6. Структура файлов

| Файл | Действие |
|---|---|
| `src/hooks/useForwardRecipients.ts` | Новый -- загрузка клиентов/преподавателей |
| `src/components/crm/ForwardMessageModal.tsx` | Переработка -- табы, выбор мессенджера, новые типы |
| `src/components/crm/ChatArea.tsx` | Обновление -- парсинг forwarded_message, навигация, пропсы |
| `src/components/crm/ChatMessage.tsx` | Обновление -- кликабельная навигация по пересылке |
