
# Исправление создания новых клиентов из всех мессенджеров

## Проблема
Когда новый клиент пишет впервые, он не создается в системе. Причины различаются по каждому вебхуку, но сводятся к двум категориям:
1. INSERT содержит колонки, которых нет в self-hosted схеме (`status`, `source`) -- INSERT падает
2. Поиск клиента использует `.single()` вместо `.maybeSingle()` -- запрос падает при 0 результатов
3. Деактивированные клиенты (`is_active = false`) не восстанавливаются при повторном обращении

## Что будет исправлено

### 1. `whatsapp-webhook` (GreenAPI)
**Проблема**: При создании клиента передаются `source: 'whatsapp'` и `status: 'new'` -- обе колонки отсутствуют в self-hosted схеме. INSERT падает.
**Исправление**: Убрать `source` и `status`, добавить `is_active: true`. При ошибке unique constraint -- найти и восстановить деактивированного клиента.

### 2. `telegram-crm-webhook` (Telethon)
**Проблема**: При создании клиента передается `source: 'telegram_crm'` -- колонка отсутствует. INSERT падает.
**Исправление**: Убрать `source`, добавить `is_active: true`. При ошибке unique constraint -- восстановить деактивированного клиента. Также расширить поиск на `is_active = false`.

### 3. `telegram-webhook` (Wappi Telegram)
**Проблема**: RPC функция `find_or_create_telegram_client` может не существовать на self-hosted, а legacy fallback не добавляет `is_active: true` и не восстанавливает деактивированных клиентов.
**Исправление**: Добавить `is_active: true` в INSERT legacy-функции. При ошибке unique constraint -- восстановить клиента. Расширить поиск на неактивных клиентов.

### 4. `max-webhook` (GreenAPI MAX)
**Проблема**: Поиск по `max_chat_id` и `max_user_id` использует `.single()`, который падает при 0 результатах. Кроме того, поиск по телефону тоже использует `.limit(1).single()`.
**Исправление**: Заменить `.single()` на `.maybeSingle()` во всех трех поисковых запросах. Добавить обработку unique constraint при создании.

### 5. `wappi-whatsapp-webhook` (Wappi WhatsApp)
**Проблема**: При ошибке создания клиента выбрасывается `throw createError`, что прерывает весь вебхук. Нет обработки unique constraint и восстановления деактивированных.
**Исправление**: Обработать unique constraint -- найти и восстановить клиента. Обернуть вставку в `client_phone_numbers` в try/catch (таблица может не существовать). Расширить поиск на `is_active = false`.

### 6. `wpp-webhook` (WPP)
Уже корректно обрабатывает создание клиентов и unique constraint. Без изменений.

## Общий паттерн для всех вебхуков

```text
findOrCreateClient():
  1. Поиск клиента БЕЗ фильтра is_active (находим и деактивированных)
  2. Если найден с is_active = false --> UPDATE is_active = true, вернуть
  3. Если найден с is_active = true --> вернуть как есть
  4. Если не найден --> INSERT с is_active: true, БЕЗ source/status
  5. Если INSERT упал на unique constraint (23505):
     --> Найти без фильтров и восстановить (UPDATE is_active = true)
```

## Список файлов для изменения

| Файл | Изменения |
|------|-----------|
| `supabase/functions/whatsapp-webhook/index.ts` | Убрать `source`/`status` из INSERT, добавить `is_active: true`, обработка constraint |
| `supabase/functions/telegram-crm-webhook/index.ts` | Убрать `source`, добавить `is_active: true`, поиск с восстановлением |
| `supabase/functions/telegram-webhook/index.ts` | Добавить `is_active: true` в legacy INSERT, обработка constraint, поиск неактивных |
| `supabase/functions/max-webhook/index.ts` | `.single()` --> `.maybeSingle()`, обработка constraint при создании |
| `supabase/functions/wappi-whatsapp-webhook/index.ts` | Обработка constraint, try/catch для `client_phone_numbers`, поиск неактивных |
