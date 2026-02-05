

## Исправление ошибки `.catch is not a function` в Edge Functions

### Проблема
В webhook-функциях используется неправильный паттерн работы с Supabase:
```typescript
// НЕПРАВИЛЬНО - .insert() возвращает query builder, не Promise
await supabase.from('webhook_logs').insert({...}).catch(e => console.error(...))
```

Ошибка: `TypeError: supabase.from(...).insert(...).catch is not a function`

### Причина
Supabase JS Client v2 возвращает `PostgrestFilterBuilder` из `.insert()`, а не Promise напрямую. Метод `.catch()` не существует на этом объекте.

### Решение
Заменить на правильный паттерн с `then()`:
```typescript
// ПРАВИЛЬНО - используем .then() для обработки результата
supabase.from('webhook_logs').insert({...}).then(({ error }) => {
  if (error) console.error('[webhook] Failed to log push result:', error)
})
```

---

### Файлы для исправления

#### 1. `supabase/functions/salebot-webhook/index.ts` (строка 304-315)

**Было:**
```typescript
await supabase.from('webhook_logs').insert({
  messenger_type: 'push-diagnostic',
  event_type: 'push-sent',
  webhook_data: {...},
  processed: true
}).catch(e => console.error('[salebot-webhook] Failed to log push result:', e))
```

**Станет:**
```typescript
supabase.from('webhook_logs').insert({
  messenger_type: 'push-diagnostic',
  event_type: 'push-sent',
  webhook_data: {...},
  processed: true
}).then(({ error }) => {
  if (error) console.error('[salebot-webhook] Failed to log push result:', error)
})
```

#### 2. `supabase/functions/max-webhook/index.ts` (строка 259-270)

**Было:**
```typescript
await supabase.from('webhook_logs').insert({...}).catch((e: unknown) => console.error('[max-webhook] Failed to log push result:', e));
```

**Станет:**
```typescript
supabase.from('webhook_logs').insert({...}).then(({ error }) => {
  if (error) console.error('[max-webhook] Failed to log push result:', error)
})
```

#### 3. `supabase/functions/telegram-webhook/index.ts` (строка 277-288)

**Было:**
```typescript
await supabase.from('webhook_logs').insert({...}).catch((e: unknown) => console.error('[telegram-webhook] Failed to log push result:', e));
```

**Станет:**
```typescript
supabase.from('webhook_logs').insert({...}).then(({ error }) => {
  if (error) console.error('[telegram-webhook] Failed to log push result:', error)
})
```

#### 4. `supabase/functions/wappi-whatsapp-webhook/index.ts` (строка 429-440)

**Было:**
```typescript
await supabase.from('webhook_logs').insert({...}).catch((e: unknown) => console.error('[wappi-webhook] Failed to log push result:', e));
```

**Станет:**
```typescript
supabase.from('webhook_logs').insert({...}).then(({ error }) => {
  if (error) console.error('[wappi-webhook] Failed to log push result:', error)
})
```

---

### Порядок действий

1. Исправить salebot-webhook/index.ts
2. Исправить max-webhook/index.ts
3. Исправить telegram-webhook/index.ts
4. Исправить wappi-whatsapp-webhook/index.ts
5. GitHub Actions автоматически развернёт изменения
6. После деплоя проверить логи на сервере

---

### Проверка после деплоя

```bash
cd /home/automation/supabase-project
docker compose restart functions
sleep 5
docker logs supabase-edge-functions 2>&1 | grep -i "error" | tail -20
```

