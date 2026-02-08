
## План исправления ошибок приложения - ВЫПОЛНЕНО ✅

### ✅ Проблема 1: useTodayMessagesCount использует несуществующие колонки

**Файл:** `src/hooks/useTodayMessagesCount.ts`

**Решение применено:** Заменено `direction: 'outgoing'` и `sender_id` на `is_outgoing: true` и `user_id` для совместимости с self-hosted схемой.

---

### ✅ Проблема 2: UnreadByMessenger включает "calls" как messenger_type

**Файлы исправлены:**
- `src/hooks/usePinnedChatThreads.ts`
- `src/hooks/useChatThreadsInfinite.ts`
- `src/hooks/usePhoneSearchThreads.ts`

**Решение применено:** Добавлена проверка `type !== 'calls'` перед инкрементом счётчика в unreadByMessenger.

---

### ✅ Проблема 3: Button внутри button (NewChatModal в TabsTrigger)

**Файл:** `src/pages/CRM.tsx`

**Решение применено:** NewChatModal вынесен за пределы TabsTrigger и позиционирован абсолютно внутри контейнера с TabsList.

---

### Проблема 4: JSON.parse ошибки - НЕ ТРЕБУЕТ ИЗМЕНЕНИЙ

**Причина:** Ошибки JSON.parse были следствием проблем 1 и 2 (неправильные запросы к API). После исправления схемы запросов ошибки должны исчезнуть.

**selfHostedApi.ts** уже имеет проверку Content-Type перед вызовом `response.json()` (строка 164).

---

## Статус выполнения

| Файл | Статус |
|------|--------|
| `src/hooks/useTodayMessagesCount.ts` | ✅ Готово |
| `src/hooks/usePinnedChatThreads.ts` | ✅ Готово |
| `src/hooks/useChatThreadsInfinite.ts` | ✅ Готово |
| `src/hooks/usePhoneSearchThreads.ts` | ✅ Готово |
| `src/pages/CRM.tsx` | ✅ Готово |

---

## Следующие шаги

1. Проверить консоль браузера на отсутствие ошибок
2. Убедиться что кнопка "+" рядом с табом "Чаты" работает корректно
3. Проверить что счётчик отправленных сообщений за день работает
