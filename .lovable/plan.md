
# Fix: Оплата через Telegram — ₽ не показывается, непрочитанное "1" вместо значка, благодарственное сообщение не отправляется

## 3 обнаруженные проблемы

### Проблема 1: Значок ₽ не отображается в списке чатов и кнопка "Оплата проведена" отсутствует

**Причина**: При открытии чата данные клиента кэшируются в `activeClientInfo` (CRM.tsx, строки 1441-1447), но **без поля `has_pending_payment`**. Функция `getActiveClientInfo()` (строка 1871) возвращает закэшированные данные приоритетно. В результате `hasPendingPayment` всегда `false` в ChatArea.

**Решение**: Добавить `has_pending_payment` во все места, где устанавливается `activeClientInfo`.

### Проблема 2: Показывается "1" непрочитанное вместо значка ₽

**Причина**: Системное сообщение `tbank_success` создаётся в tbank-webhook с `is_read: false` и `is_outgoing: false` (строка 142-150). В `useChatThreadsInfinite.ts` (строка 128-130) подсчёт непрочитанных фильтрует только по `!is_read && !is_outgoing`, **не исключая** `message_type: 'system'`. Поэтому системное сообщение об оплате считается непрочитанным. А в ChatListItem значок ₽ показывается только при `has_pending_payment && !displayUnread` — если есть непрочитанные, они приоритетнее.

Подождите — на самом деле ChatListItem (строка 336-350) показывает ₽ если `has_pending_payment`, а unread бейдж только если `!has_pending_payment`. Значит проблема именно в том, что `has_pending_payment` не попадает в данные. Но также нужно исключить системные сообщения из подсчёта непрочитанных.

**Решение**: 
- В tbank-webhook создавать системное сообщение с `is_read: true` (системные уведомления не должны считаться непрочитанными)
- В useChatThreadsInfinite исключить `message_type: 'system'` из подсчёта непрочитанных

### Проблема 3: Благодарственное сообщение не отправляется через Telegram

**Причина**: tbank-webhook вызывает `telegram-send` через `fetch()`. На self-hosted сервере переменная `SELF_HOSTED_URL` может быть не установлена, и `SUPABASE_URL` внутри Docker = `http://kong:8000`, что не маршрутизируется к edge functions правильно. Также `telegram-send` ожидает параметр `text` (а не `message`) — нужно проверить.

**Решение**: Проверить параметры вызова telegram-send в tbank-webhook и исправить имя параметра сообщения.

## Файлы для изменения

### 1. `src/pages/CRM.tsx` — добавить `has_pending_payment` в кэш activeClientInfo

Все 4 места, где вызывается `setActiveClientInfo`:
- Строка 1441: из existingClient — добавить `has_pending_payment: (existingClient as any).has_pending_payment || false`
- Строка 1449: из existingThread — добавить `has_pending_payment: (existingThread as any).has_pending_payment || false`
- Строка 1487: из clientData (full fetch) — добавить `has_pending_payment: (clientData as any).has_pending_payment || false`
- Строка 1495: partial update — сохранить `has_pending_payment` из prev

Также добавить подписку на realtime-обновления `clients.has_pending_payment`:
- При получении UPDATE для clients — обновить activeClientInfo если совпадает ID

### 2. `supabase/functions/tbank-webhook/index.ts` — исправить создание системного сообщения

Строка 148: изменить `is_read: false` на `is_read: true` — системные уведомления об оплате не должны считаться непрочитанными клиентскими сообщениями.

### 3. `supabase/functions/tbank-webhook/index.ts` — исправить вызов telegram-send

Строка 264-270: проверить и исправить параметры для telegram-send. Текущий параметр `message` может не совпадать с ожидаемым в telegram-send.

### 4. `src/hooks/useChatThreadsInfinite.ts` — исключить системные сообщения из подсчёта непрочитанных

Строка 128-130: добавить фильтр `&& m.message_type !== 'system'` в подсчёт непрочитанных.

## Ожидаемый результат

- После оплаты через Telegram в списке чатов отображается значок ₽ (а не "1")
- В тулбаре ChatArea появляется кнопка "Оплата проведена"
- Благодарственное сообщение отправляется клиенту через Telegram автоматически
- Системные сообщения об оплате не увеличивают счётчик непрочитанных
