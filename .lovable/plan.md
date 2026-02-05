## Исправление ошибки `.catch is not a function` в Edge Functions

**СТАТУС: ✅ ИСПРАВЛЕНО**

### Проблема
1. `.catch is not a function` — неправильный паттерн работы с Supabase
2. `22P02` — `messenger_type` это enum, 'push-diagnostic' не валидное значение
3. `42703` — колонка `avatar_url` не существует в `clients` на self-hosted

### Решение
1. Удалены `webhook_logs` inserts с 'push-diagnostic' из всех webhook-функций
2. `bulk-fetch-avatars` исправлен: убрана колонка `avatar_url`, `is_enabled` → `is_active`
3. Push диагностика теперь через `console.log`

### Проверка после деплоя

```bash
cd /home/automation/supabase-project
docker compose restart functions
sleep 5
docker logs supabase-edge-functions 2>&1 | grep -i "error" | tail -20
```

