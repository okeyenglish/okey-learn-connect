

## Проблема

Колонка `sender_name` не существует в таблице `chat_messages` на self-hosted сервере (`api.academyos.ru`). После добавления `sender_name` в select-запросы, сервер возвращает ошибку 400 (`column chat_messages.sender_name does not exist`), и сообщения не загружаются.

## Решение

Убрать `sender_name` из всех select-запросов к self-hosted серверу и определять имя менеджера через данные профиля текущего пользователя (уже доступны через `useAuth`).

## Изменения

### 1. `src/hooks/useChatMessagesOptimized.ts`
- Убрать `sender_name` из select-строки в основном запросе (строка 53)
- Убрать `sender_name` из select-строки в prefetch-запросе (строка 317)  
- Убрать `sender_name` из fallback select-строки (строка 332)

### 2. `src/components/crm/ChatArea.tsx`
- Убрать использование `msg.sender_name` — оставить только `managerName` из профиля пользователя (уже передается как fallback)

### 3. `src/hooks/useInfiniteChatMessages.ts` и `src/hooks/useInfiniteChatMessagesTyped.ts`
- Проверить что `sender_name` не используется в select-запросах (они чистые, без `sender_name` — OK)

Итого: минимальные правки в 2 файлах для восстановления работоспособности загрузки диалогов.

