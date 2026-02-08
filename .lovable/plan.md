
Цель: убрать перезагрузку/белый экран при клике на чат преподавателя и сделать открытие teacher-чатов устойчивым даже при ошибках бэкенда/схемы.

Что удалось выяснить по коду (текущий статус проекта)
1) Teacher-чаты действительно открываются через виртуальный идентификатор `clientId = "teacher:{uuid}"` (см. `TeacherChatArea.tsx`, строки ~109-113 и resolve-логика ~253-275).
2) В `ChatArea.tsx` до сих пор есть блок “клиентских” хуков/запросов, которым передаётся `clientId` без фильтрации:
   - `useClientUnreadByMessenger(clientId)` (строки ~487-493)
   - `useViewedMissedCalls(clientId)` (строки ~495-497)
   - `useCallLogsRealtime(clientId)` (строки ~498-499)
   - и ряд других клиентских действий внутри `ChatArea.tsx`, которые местами делают `.eq('id', clientId)`/`.eq('client_id', clientId)` и т.п. (поиск показал несколько таких участков).
3) Часть хуков мы уже “захарднили” (например `useTypingStatus`, `useNewMessageRealtime`, `useMessageStatusRealtime`, `useViewedMissedCalls`, `useCallLogsRealtime`) — но `ChatArea.tsx` всё равно инициирует клиентские сценарии и, главное, `useClientUnreadByMessenger` всё ещё делает запросы по `client_id` без проверки UUID.
4) В `TeacherChatArea.tsx` есть async `resolve()` внутри `useEffect` без общего `try/catch`. Если там случается ошибка (например, запрос к таблице/колонке не совпадает со схемой), это легко превращается в “Unhandled async error”, что в реальных браузерах часто выглядит как “страница как будто перезагрузилась и белый экран” (особенно когда React-дерево падает, а ErrorBoundary глобально не установлен).

Гипотеза первопричины (наиболее вероятно)
A) При клике на teacher-чат запускается `ChatArea` с `clientId="teacher:..."`.
B) `ChatArea` запускает “клиентские” хуки (в частности `useClientUnreadByMessenger`) и/или клиентские побочные эффекты.
C) Где-то в цепочке возникает ошибка (частый вариант — попытка отправить в БД строку `teacher:...` в фильтр по UUID, либо ошибка в async-эффекте без try/catch), из‑за чего React-дерево падает → белый экран.

План исправления (делаем в 2 слоя: предотвращение причины + страховка)

1) Ввести “безопасный UUID для клиентских хуков” прямо в `ChatArea.tsx`
   - Импортировать из `src/lib/uuidValidation.ts` функции `isValidUUID`/`safeUUID`.
   - Рассчитать:
     - `const isDirectTeacherMessage = clientId.startsWith('teacher:')`
     - `const clientUUID = safeUUID(clientId)` (вернёт `null`, если `teacher:...` или любой не‑UUID)
     - `const clientIdForUuidHooks = clientUUID ?? ''` (если хуку нужен string)
     - `const clientIdForUuidHooksNullable = clientUUID` (если хук принимает string | null)
   - Важно: исходный `clientId` оставить как есть для “teacher‑источника сообщений” и для draft-key (черновики) — чтобы разные teacher-чаты не смешивались.

2) Переподключить проблемные хуки в `ChatArea.tsx` на безопасный идентификатор
   Конкретно:
   - `useClientAvatars(...)` → передавать `clientUUID` (или `clientUUID ?? null`)
   - `useTypingStatus(...)` → `useTypingStatus(clientIdForUuidHooks)` (и внутри он уже пропускает не-UUID)
   - `useClientUnreadByMessenger(...)` → передавать `clientIdForUuidHooks` И дополнительно (см. пункт 3) — чтобы сам хук выключался.
   - `useViewedMissedCalls(...)` → `useViewedMissedCalls(clientIdForUuidHooks)`
   - `useCallLogsRealtime(...)` → `useCallLogsRealtime(clientUUID ?? undefined)` (чтобы для teacher:... не было фильтра по UUID)
   - `useNewMessageRealtime(...)` и `useMessageStatusRealtime(...)` — вызывать с `clientIdForUuidHooks` (или оставить как есть, но безопаснее унифицировать).

   Результат: никакой “клиентский” запрос/реалтайм‑фильтр не получит `teacher:...`.

3) Захарднить `useClientUnreadByMessenger` (src/hooks/useChatMessages.ts)
   Сейчас это главный “дыра‑кандидат”: он всегда делает `.eq('client_id', clientId)` если строка непустая.
   - Добавить `import { isValidUUID } from '@/lib/uuidValidation'`
   - В начале `queryFn`:
     - если `!clientId || !isValidUUID(clientId)` → сразу вернуть нулевые счётчики и `lastUnreadMessenger: null`
   - В опциях `useQuery`:
     - `enabled: isValidUUID(clientId)` вместо `enabled: !!clientId`
   Это гарантирует, что teacher:... вообще не вызовет SQL-запрос по UUID колонке.

   Дополнительно: `getUnviewedMissedCallsCount(clientId)` (который дергает self-hosted API) тоже лучше вызывать только для UUID, чтобы не создавать лишние ошибки/ретраи.

4) Убрать/загардить клиентские DB-операции в `ChatArea.tsx`, которые потенциально выполняются в teacher-режиме
   По найденным местам (примерно):
   - любые `.from('clients').update(...).eq('id', clientId)`
   - любые `.from('chat_messages').update(...).eq('client_id', clientId)` в автоматических эффектах/обработчиках
   Правило: если `clientUUID == null`, то:
   - либо `return` (teacher-чат не должен трогать таблицу clients),
   - либо использовать `buildMessageRecord(...)` и писать в teacher_id, а client_id ставить null (если это действительно сценарий teacher-сообщений).

5) Обязательная страховка от “белого экрана”: глобальный ErrorBoundary
   Сейчас `ErrorBoundary.tsx` существует, но не оборачивает CRM глобально.
   - В `src/App.tsx` обернуть дерево приложения (минимум `BrowserRouter` + `AppContent`) в `<ErrorBoundary>...</ErrorBoundary>`.
   - Это не “лечит” первопричину, но гарантирует, что вместо пустого экрана будет понятная страница с текстом ошибки, и CRM перестанет “умирать молча”.

6) Стабилизировать async-вычисление `resolvedClientId` в `TeacherChatArea.tsx`
   - В `useEffect` с `resolve()` добавить общий `try/catch` вокруг всей async-логики.
   - В `catch`:
     - логировать ошибку (`console.error`)
     - показывать toast “Не удалось открыть чат преподавателя”
     - безопасно делать `setResolvedClientId(null)` (чтобы не попасть в полусломанное состояние)
   - Это убирает “Unhandled async error” из самого места, которое срабатывает именно при клике по teacher-чатам.

7) Диагностика (встроенная, чтобы добить остаточные причины если они есть)
   Так как вы видите “просто белый экран” без красного оверлея и без лога сборки, добавим временные, очень точечные логи:
   - В `ChatArea.tsx` при монтировании:
     - `clientId`, `isDirectTeacherMessage`, `clientUUID`, `messagesSource`
   - В `TeacherChatArea.tsx` в `resolve()`:
     - `selectedTeacherId`, найден ли teacher, какой `teacher.clientId`, какой `resolvedClientId` выставили
   Если после фикса всё ещё будет белый экран — по этим логам станет ясно, какая именно ветка срабатывает перед падением.

Файлы, которые нужно менять
- `src/components/crm/ChatArea.tsx` (основная маршрутизация “safe id” + гард клиентских сценариев)
- `src/hooks/useChatMessages.ts` (захарднить `useClientUnreadByMessenger` на UUID)
- `src/components/crm/TeacherChatArea.tsx` (try/catch для async resolve)
- `src/App.tsx` (обернуть приложение в `ErrorBoundary`)
(опционально) `src/hooks/useChatMessages.ts` / `src/hooks/useViewedMissedCalls.ts` — дополнительный UUID-гард для self-hosted вызовов, чтобы не было шумных ретраев.

Порядок внедрения
1) `useClientUnreadByMessenger`: UUID-гард + enabled.
2) `ChatArea.tsx`: safeClientUUID и переподключение хуков на safe id.
3) `TeacherChatArea.tsx`: try/catch в resolve.
4) `App.tsx`: глобальный ErrorBoundary.
5) Быстрый регресс-тест.

Как проверим, что проблема ушла (чеклист)
- Открыть 5-10 разных teacher-чатов подряд: нет перезагрузок, нет белого экрана.
- Открыть обычные клиентские чаты: всё как раньше.
- Проверить “Чат педагогов” (если используете) и контекстное меню teacher-чатов (Mark read/unread): не падает.
- Проверить вкладки WhatsApp/Telegram/Max в teacher-чате: переключаются, не вызывают ошибок.
- Если что-то всё ещё ломается — ErrorBoundary покажет текст ошибки, и мы точечно добьём оставшийся источник.

Риски/нюансы
- В teacher‑чатах некоторые “клиентские” элементы UI (бейджи непрочитанных по мессенджерам, звонки, аватары из clients) логично отключить или показывать в нейтральном виде, иначе система будет пытаться считать метрики по несуществующему client UUID.
- Отправка сообщений в teacher:режиме сейчас частично использует `clientId` при сохранении “failed” сообщений (видно в `sendMessageNow`): это не причина белого экрана при клике, но я приведу все insert/update к единообразному `buildMessageRecord` чтобы не было будущих скрытых ошибок при отправке.
