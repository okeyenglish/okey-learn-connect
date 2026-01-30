

# План: Импорт только клиентов без истории сообщений из Salebot

## ✅ ВЫПОЛНЕНО

---

## Что было сделано

### 1. SQL миграция для self-hosted
Создан файл `docs/migrations/20250130_add_import_rpc_functions.sql`:
- `get_clients_without_imported_messages(p_org_id, p_offset, p_limit)` — возвращает клиентов с salebot_client_id, у которых нет сообщений с salebot_message_id. Теперь также возвращает `salebot_client_type`.
- `count_clients_without_imported_messages(p_org_id)` — подсчёт таких клиентов для UI

### 2. Исправлен messenger_type в импорте
Обновлён `supabase/functions/import-salebot-chats-auto/index.ts`:
- Добавлена функция `getMessengerTypeFromClientType()` для маппинга:
  - 1, 16, 21 → telegram
  - 6 → whatsapp
  - 20 → max
  - 0 → vk
  - 2 → viber
  - default → telegram
- Все 6 мест с hardcoded `'whatsapp'` заменены на вызов функции маппинга
- Все SQL-запросы к clients теперь включают `salebot_client_type`

---

## Инструкции для self-hosted

1. **Применить миграцию salebot_client_type** (если ещё не сделано):
   ```bash
   psql -f docs/migrations/20250130_add_salebot_client_type.sql
   ```

2. **Применить миграцию RPC функций**:
   ```bash
   psql -f docs/migrations/20250130_add_import_rpc_functions.sql
   ```

3. **Задеплоить Edge Function** (автоматически через GitHub Actions или вручную)

---

## Результат

После применения:
1. ✅ Режим "Импорт новых" будет работать на self-hosted
2. ✅ Сообщения будут привязываться к правильному мессенджеру (Telegram, WhatsApp, и т.д.)
3. ✅ Переписка из Telegram останется в Telegram, а не в WhatsApp
