
Цель: чтобы в self-hosted (api.academyos.ru) быстро появились (1) превью/последнее сообщение в списке чатов преподавателей и (2) сами сообщения в окне диалога — без долгой “Загрузка чата…” и без 400-ошибок по отсутствующим колонкам.

## Что сейчас ломает преподавательские чаты (диагностика по логам/сети)
1) Запрос истории сообщений преподавательского чата (режим `messagesSource="teacher"` через client_id) падает 400:
- Запрос: `GET .../chat_messages?select=...external_id...`
- Ответ: `column chat_messages.external_id does not exist` (код 42703)
Это прямо объясняет, почему сообщения “не появляются”: запрос не может выполниться вообще.

2) В self-hosted нет колонки `direction`, но часть кода продолжает её использовать:
- Есть запросы вида `...chat_messages?...&direction=eq.incoming...`
- Ответ: `column chat_messages.direction does not exist` (код 42703)
Из-за этого ломаются/обнуляются подсчёты непрочитанных и превью, а также создаётся лишняя нагрузка (ошибочные запросы на старте/фоне).

3) Дополнительный ускоритель “prefetch при наведении” в `TeacherListItem` сейчас делает потенциально неправильные запросы:
- может пытаться префетчить по `client_id="teacher:uuid"` (не UUID) → в БД это UUID-колонка, такой фильтр приводит к ошибкам/лишним запросам
- в select используются cloud-колонки (`content`, `media_url`, `messenger`, `status`), которые на self-hosted часто отсутствуют → снова 42703

## Что сделаем в коде (без “fallback ради fallback”, а по-нормальному для self-hosted)
Ниже — конкретные правки и почему они ускорят загрузку.

### A) Починить загрузку сообщений преподавательского чата по client_id (главный blocker)
Файл: `src/hooks/useTeacherChats.ts` (хук `useTeacherChatMessages(clientId, enabled)`)

План изменений:
1) В прямом SELECT убрать несуществующую колонку `external_id` (и любые потенциально cloud-only поля, если они там есть).
   - Сейчас именно `external_id` гарантированно ломает запрос (есть подтверждение в network logs).
2) Сделать “self-hosted direct select” основным путём, а RPC — только как запасной вариант (на случай, если на конкретной роли/политике прямой select вернёт запрет/пусто).
   - Это уберёт ожидание таймаута RPC и сразу даст быстрый запрос по индексу `client_id + created_at`.
3) Нормализацию полей оставить, но строить её от реально существующих self-hosted колонок:
   - текст: `message_text`
   - входящее/исходящее: `is_outgoing`
   - внешний id: `external_message_id` (если нужен)
   - messenger: `messenger_type`

Ожидаемый эффект: запрос перестаёт падать 400 и начинает отдавать историю сообщений.

### B) Починить превью/последнее сообщение в списке преподавателей (и убрать 42703 по direction)
Файл: `src/hooks/useTeacherConversations.ts`

План изменений:
1) В `.select(...)` убрать `direction`:
   - заменить на self-hosted набор: `teacher_id, created_at, message_text, messenger_type, is_read, is_outgoing` (+ `messenger` только если он реально есть и используется)
2) В подсчёте непрочитанных убрать `m.direction === 'incoming'`, оставить self-hosted условие:
   - “входящее = `is_outgoing === false`”
3) В `lastMessageText` не пытаться читать `content` (cloud), оставить `message_text`.

Ожидаемый эффект: teacherConversations снова начнёт заполняться, а TeacherChatArea (который мёрджит teacherConversations в список) начнёт показывать последнее сообщение и время.

### C) Убрать лишние ошибочные префетчи и сделать их безопасными
Файл: `src/components/crm/TeacherListItem.tsx`

План изменений:
1) Добавить строгую проверку clientId перед prefetch:
   - если `teacher.clientId` не UUID (например `teacher:...`) — НЕ делать RPC и НЕ делать `.eq('client_id', ...)` (иначе будут ошибки/лишняя нагрузка).
2) Для UUID clientId:
   - prefetch делать прямым select с self-hosted колонками (без `content`, `media_url`, `messenger`, `status`, `external_id`).
3) Опционально: для `teacher:uuid` вместо пропуска можно префетчить `teacher-chat-messages-v2` (infinite query), но это вторично — главное убрать ошибки и “шум”.

Ожидаемый эффект: меньше 400/42703 в фоне, меньше “тормозов” при наведении/скролле списка.

### D) Убрать фоновые 400 из-за direction (уменьшит “тормозит” по всей CRM)
Минимальный набор (который уже видно в сети):
- Файл: `src/utils/sendActivityWarningMessage.ts`
  - заменить `.eq('direction', 'incoming')` на self-hosted критерий входящих: `.eq('is_outgoing', false)` (и оставить `is_read=false`)
- Файл: `src/hooks/useSystemChatMessages.ts` (там тоже есть `.eq('direction', 'incoming')`)
  - аналогично заменить на `is_outgoing=false` или `message_type='client'` (в зависимости от того, как у вас помечаются входящие в self-hosted)

Ожидаемый эффект: меньше постоянных ошибок и меньше параллельных “битых” запросов, которые забивают канал и создают ощущение, что всё висит.

## Производительность: что нужно на self-hosted базе (иначе даже правильный код может быть медленным)
Если сообщений много, без индекса по `teacher_id/created_at` получение истории и превью может быть реально медленным.

Рекомендованные индексы для self-hosted (SQL дать вам в готовом виде, вы выполните на своём сервере):
1) Для диалогов преподавателей по teacher_id:
```sql
CREATE INDEX IF NOT EXISTS idx_chat_messages_teacher_id_created
ON public.chat_messages (teacher_id, created_at DESC);
```

2) Для преподавательских чатов, которые идут через client_id (групповой “Чат педагогов” и/или “преподаватель как клиент”):
```sql
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_id_created
ON public.chat_messages (client_id, created_at DESC);
```

Опционально (если часто считаем непрочитанные):
```sql
CREATE INDEX IF NOT EXISTS idx_chat_messages_teacher_unread
ON public.chat_messages (teacher_id, is_read, created_at DESC)
WHERE is_read = false AND is_outgoing = false;
```

Важно: на некоторых SQL-раннерах нельзя `CONCURRENTLY` — будем делать без него.

## Порядок внедрения (чтобы быстро проверить результат)
1) Быстрое исправление “сообщения не грузятся совсем”:
   - `useTeacherChats.ts`: убрать `external_id` из select и перестроить primary path на direct self-hosted select.
2) Быстрое исправление превью:
   - `useTeacherConversations.ts`: убрать `direction` из select и логики unread.
3) Снять лишнюю нагрузку:
   - `TeacherListItem.tsx`: запретить prefetch для не-UUID и поправить select.
4) Убрать фоновые 400:
   - `sendActivityWarningMessage.ts` (+ при необходимости `useSystemChatMessages.ts`)
5) Проверка в UI:
   - открыть “Чат педагогов” и конкретного преподавателя
   - убедиться, что список показывает последнее сообщение
   - убедиться, что сообщение 15 минут назад (через WPP) видно в списке и в диалоге
   - открыть DevTools → Network/Console: не должно быть 400 с `external_id` и `direction`
6) Если всё стало “работает, но всё ещё медленно”:
   - применить индексы на self-hosted БД и повторно измерить время загрузки.

## Что будет считаться успехом
- В списке преподавателей вместо “Нет сообщений” появляется текст последнего сообщения и время (без ожидания минутами).
- При открытии преподавателя/группы сообщения появляются за секунды, без бесконечной “Загрузка чата…”.
- В консоли/сети исчезают 400 ошибки:
  - `external_id does not exist`
  - `direction does not exist`
