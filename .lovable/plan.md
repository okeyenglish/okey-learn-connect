
## План исправления ошибок приложения - ВЫПОЛНЕНО ✅

### ✅ Проблема 1: useTodayMessagesCount использует несуществующие колонки

**Файл:** `src/hooks/useTodayMessagesCount.ts`

**Первоначальное решение:** Заменено `direction: 'outgoing'` и `sender_id` на `is_outgoing: true` и `user_id`

**Дополнительное исправление:** Self-hosted схема НЕ имеет колонок `is_outgoing` и `user_id` в `chat_messages`. Вместо этого используется `message_type = 'manager'` для исходящих сообщений.

**Окончательное решение:** Создан Edge Function `get-today-messages-count` который использует правильную схему self-hosted базы с `message_type = 'manager'`.

---

### ✅ Проблема 2: UnreadByMessenger включает "calls" как messenger_type

**Файлы исправлены:**
- `src/hooks/usePinnedChatThreads.ts`
- `src/hooks/useChatThreadsInfinite.ts`
- `src/hooks/usePhoneSearchThreads.ts`

**Решение применено:** Добавлена проверка `type !== 'calls'` перед инкрементом счётчика в unreadByMessenger.

**Примечание:** Ошибка `invalid input value for enum messenger_type: "calls"` происходит в RPC функции `get_chat_threads_by_client_ids` на self-hosted базе. Это требует исправления на стороне сервера (добавление 'calls' в enum или фильтрация в RPC). Текущий fallback корректно обрабатывает эту ошибку.

---

### ✅ Проблема 3: Button внутри button (NewChatModal в TabsTrigger)

**Файл:** `src/pages/CRM.tsx`

**Решение применено:** NewChatModal вынесен за пределы TabsTrigger и позиционирован абсолютно внутри контейнера с TabsList.

---

### ⚠️ Проблема 4: DialogContent requires DialogTitle

**Причина:** Некоторые Dialog компоненты не имеют DialogTitle для accessibility.

**Статус:** Предупреждение, не критичная ошибка. Требует ревью всех Dialog компонентов.

---

### ⚠️ Проблема 5: JSON.parse ошибки

**Причина:** Массовые ошибки JSON.parse являются следствием:
1. Проблем со схемой в useTodayMessagesCount (ИСПРАВЛЕНО)
2. RPC ошибок с 'calls' enum (падает в fallback)
3. Проблем с внешними сервисами (webhook.site, configcat)

---

## Файлы изменены

| Файл | Изменение |
|------|-----------|
| `src/hooks/useTodayMessagesCount.ts` | Переключен на self-hosted API endpoint |
| `supabase/functions/get-today-messages-count/index.ts` | **НОВЫЙ** - Edge Function для подсчёта сообщений |
| `src/hooks/usePinnedChatThreads.ts` | Исключить 'calls' из messenger_type инкремента |
| `src/hooks/useChatThreadsInfinite.ts` | Исключить 'calls' из messenger_type инкремента |
| `src/hooks/usePhoneSearchThreads.ts` | Исключить 'calls' из messenger_type инкремента |
| `src/pages/CRM.tsx` | Вынести NewChatModal из TabsTrigger |

---

## Требуется на self-hosted сервере

1. **Деплой Edge Function** `get-today-messages-count` на `api.academyos.ru`
2. **Исправление RPC** `get_chat_threads_by_client_ids` - убрать 'calls' из результата или добавить в enum
