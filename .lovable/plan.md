
Диагностика по текущему коду и стектрейсу показывает две независимые проблемы, которые вместе дают “белый экран” и “чаты не загружаются”.

## 1) Почему возникает ошибка `can't access property "length", pages is undefined`
### Наблюдение
В `ChatArea.tsx` сейчас всегда монтируется вкладка звонков:

- `ChatArea.tsx` (примерно ~3220): `<CallHistory clientId={clientId} />`

В teacher-чате `clientId` бывает не UUID, а маркер вида `teacher:{uuid}` (это нормально для сообщений преподавателя, но не подходит для звонков/клиентских таблиц).

`CallHistory` использует `useInfiniteCallHistory(clientId)`, а в этом хуке есть небезопасные обращения:
- `cached.pages.length`
- `query.data.pages.length`

Если `pages` отсутствует (битый/старый кэш в localStorage или нетипичный объект в data), Firefox выдаёт ровно: `pages is undefined`, и падает всё дерево → ErrorBoundary показывает экран “На главную”.

### Что исправляем
1) **Запретить teacher-маркеру попадать в CallHistory**:
   - В `ChatArea.tsx` передавать в `CallHistory` только `clientUUID` (валидный UUID) или пустую строку:
     - `const callHistoryClientId = clientUUID ?? ''`
     - `<CallHistory clientId={callHistoryClientId} />`
2) **Опционально (рекомендую)**: скрывать/отключать вкладку “Звонки” для teacher-чатов (потому что для преподавателя нет client UUID → звонки не имеют смысла).
3) **Захарднить `useInfiniteCallHistory.ts`**:
   - Добавить проверку `isValidUUID(clientId)`:
     - `enabled: isValidUUID(clientId) && isOnline`
   - В чтении кэша:
     - проверять `Array.isArray(cached.pages)` перед `.length`
   - В эффекте сохранения:
     - проверять `Array.isArray(query.data?.pages)` перед `.length`
   Это гарантирует, что даже при “битом” localStorage кэше падения не будет.

4) **Опционально**: в `CallHistory.tsx` показать понятный плейсхолдер, если `clientId` пустой (например “История звонков доступна только для клиентских чатов”).

## 2) Почему teacher-чаты не загружают сообщения
### Наблюдение
В логах ранее уже была причина:
- `[useTeacherChatMessages] Query failed: column chat_messages.content does not exist`

Это идёт из `src/hooks/useTeacherChatMessagesV2.ts` — там в `MESSAGE_FIELDS` сейчас перечислены колонки (`content`, `direction`, `messenger`, `status`, `external_id`, `media_url`, `media_type`), которых в self-hosted схеме может не быть (и судя по ошибке — точно нет `content`).

Итог: запрос падает, сообщения не приходят.

### Что исправляем
1) В `useTeacherChatMessagesV2.ts` заменить `MESSAGE_FIELDS` на “self-hosted safe” набор, как в других местах проекта (примерно):
   - `id, teacher_id, message_text, message_type, system_type, is_read, is_outgoing, created_at, file_url, file_name, file_type, external_message_id, messenger_type, call_duration, message_status, metadata`
   Убрать из select: `content, direction, messenger, status, external_id, media_url, media_type`.
2) Обновить нормализацию сообщения:
   - `content` вычислять как алиас: `content = message_text`
   - `direction` вычислять из `is_outgoing`
3) Добавить **защиту на будущее**: если select всё же упал из‑за несовпадения схемы (ошибка undefined column), логировать и возвращать пустую страницу вместо `throw`, чтобы UI не уходил в “вечную ошибку” (React Query может быть в error-state, но интерфейс не должен падать).

## 3) Дополнительные защиты в `ChatArea.tsx` (чтобы teacher:... не попадал в клиентские RPC)
Сейчас в `ChatArea.tsx` есть места, где teacher-чат может случайно считаться “клиентским”:
- `useAutoMarkChatAsRead` сейчас получает `clientId: isTeacherMessages ? null : clientId`, но для direct teacher (`teacher:...`) `isTeacherMessages` = true (в TeacherChatArea), однако лучше сделать правило жёстким: **только валидный UUID**:
  - передавать `clientId: clientUUID` и `isActive: !!clientUUID`

Аналогично можно привести к схеме “только UUID” другие действия, которые реально должны работать только для клиентов.

## 4) План действий по файлам (что именно меняем)
### A) `src/components/crm/ChatArea.tsx`
- Использовать уже вычисленный `clientUUID`/`clientIdForUuidHooks` не только для хуков, но и для UI-вкладок:
  - `<CallHistory clientId={clientUUID ?? ''} />`
  - (опционально) не рендерить вкладку calls, если `!clientUUID`
- `useAutoMarkChatAsRead`: передавать `clientId: clientUUID` и `isActive: !!clientUUID` (а не сырой `clientId`).

### B) `src/hooks/useInfiniteCallHistory.ts`
- Импорт `isValidUUID`
- `enabled: isValidUUID(clientId) && isOnline`
- Защитить кэш:
  - `if (cached && Array.isArray(cached.pages) && cached.pages.length > 0) { ... }`
  - `if (Array.isArray(query.data?.pages) && query.data.pages.length > 0 && !query.isFetching) { ... }`
- (опционально) если `clientId` не UUID — сразу возвращать “пустой” результат/не пытаться трогать localStorage.

### C) `src/components/crm/CallHistory.tsx`
- Если `clientId` пустой — показывать “недоступно” и не вызывать heavy-логику (можно просто положиться на disabled в хуках, но плейсхолдер улучшит UX).

### D) `src/hooks/useTeacherChatMessagesV2.ts`
- Починить `MESSAGE_FIELDS` под self-hosted схему (убрать несуществующие колонки).
- Нормализацию адаптировать под `message_text/is_outgoing`.
- (дополнительно) сделать запрос не “фатальным” для UI: на ошибке возвращать пустой page (или хотя бы не бросать исключение на mismatch колонок, чтобы не было бесконечного error состояния без сообщений).

## 5) Проверка (обязательно)
1) Открыть 5–10 teacher-чатов подряд:
   - нет экрана ErrorBoundary
   - сообщения реально появляются
2) Проверить обычные клиентские чаты:
   - сообщения грузятся
   - вкладка “Звонки” работает как раньше
3) Проверить, что teacher-чат не пытается:
   - отмечать “прочитано” через client RPC
   - грузить историю звонков

## 6) По build:dev (лог обрезан)
После правок выше повторно запускаем `build:dev`.
- Если сборка всё ещё падает, нам понадобится **последняя строка ошибки** (обычно начинается с `error:` или `RollupError:`). Без неё можно только гадать.
- Если UI снова обрежет вывод, можно скопировать последние 20–30 строк из места, где отображается ошибка (обычно в конце, после списка `dist/assets/...`).

Технически: текущие правки на runtime также должны уменьшить шанс “падения при сборке”, потому что устраняют падение в early-mount эффектах и завязку на некорректные ID.
