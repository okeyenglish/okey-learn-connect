

## План: Диагностика и исправление отправки сообщений через WPP

### Обнаруженная проблема
В логах сервера и сетевых запросах браузера **нет ни одного вызова к `wpp-send`**. При этом другие edge функции (`get-call-logs`, `max-webhook`) работают нормально.

### Вероятная причина
Фронтенд запрашивает таблицу `messenger_integrations`, но:
1. Либо таблица пустая/не содержит записи с `provider = 'wpp'`
2. Либо есть несколько записей и выбирается не та (GreenAPI вместо WPP)

### Диагностические команды для сервера

Выполните на сервере (в директории `/home/automation/supabase-project`):

```bash
# 1. Проверить содержимое messenger_integrations
docker compose exec db psql -U postgres -d postgres -c "SELECT id, name, provider, messenger_type, is_active, is_primary, priority FROM messenger_integrations WHERE messenger_type = 'whatsapp';"

# 2. Проверить схему chat_messages 
docker compose exec db psql -U postgres -d postgres -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'chat_messages' ORDER BY ordinal_position;"

# 3. Проверить логи за последние 10 минут с фильтром
docker compose logs functions --since 10m 2>&1 | grep -E "(wpp-send|whatsapp-send|Routing)" | tail -30
```

### План исправления (после диагностики)

**Шаг 1**: Обновить запись в `messenger_integrations` чтобы WPP был приоритетным:
```sql
-- Сделать все WhatsApp интеграции неосновными
UPDATE messenger_integrations SET is_primary = false WHERE messenger_type = 'whatsapp';

-- Установить WPP как основную и активную
UPDATE messenger_integrations SET is_primary = true, is_active = true, priority = 1 WHERE provider = 'wpp' AND messenger_type = 'whatsapp';
```

**Шаг 2**: Добавить логирование в начало `wpp-send/index.ts`:
```typescript
// Сразу после Deno.serve(async (req) => {
console.log('[wpp-send] Function called, method:', req.method)
```

**Шаг 3**: Перезапустить функции и протестировать отправку.

### Технические детали

Фронтенд (`useWhatsApp.ts`) выбирает провайдер так:
```typescript
const { data: integration } = await supabase
  .from('messenger_integrations')
  .select('*')
  .eq('messenger_type', 'whatsapp')
  .eq('is_active', true)
  .order('is_primary', { ascending: false })
  .order('priority', { ascending: true })
  .limit(1)
  .maybeSingle();
```

Если в таблице есть активная запись GreenAPI с `is_primary = true`, она будет выбрана вместо WPP.

### Ожидаемый результат

После исправления:
- Фронтенд определит `provider = 'wpp'`
- Вызовет функцию `wpp-send`
- В логах сервера появятся записи `[wpp-send] Function called`
- Сообщения будут отправляться и сохраняться в БД

