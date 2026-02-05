
## Исправление: WPP интеграция не сохраняется в БД

✅ **ВЫПОЛНЕНО** - Изменения применены, ожидает деплоя через GitHub Actions.

### Проблема
Edge Function `wpp-create` создаёт клиента на WPP Platform, но **не сохраняет интеграцию в базу данных**. INSERT выполняется без проверки результата, поэтому ошибки RLS/constraint violations проходят незамеченными.

Результат: `wpp-qr` не находит интеграцию в БД и не может получить QR код.

### Диагностика
```
SELECT id, settings FROM messenger_integrations WHERE provider = 'wpp' AND is_active = true;
→ (0 rows)  ← Интеграция НЕ сохранена!
```

---

### Технические изменения

#### 1. `supabase/functions/wpp-create/index.ts`

**Добавить проверку ошибок при INSERT:**

Строки 189-201:
```typescript
// БЫЛО:
await supabaseClient
  .from('messenger_integrations')
  .insert({...});

// СТАНЕТ:
const { data: insertedIntegration, error: insertError } = await supabaseClient
  .from('messenger_integrations')
  .insert({
    organization_id: orgId,
    messenger_type: 'whatsapp',
    provider: 'wpp',
    name: 'WhatsApp (WPP)',
    is_active: true,
    is_primary: true,
    webhook_key: crypto.randomUUID(), // ← Добавить!
    settings: newSettings,
  })
  .select()
  .single();

if (insertError) {
  console.error('[wpp-create] Failed to save integration:', insertError);
  return errorResponse('Failed to save integration: ' + insertError.message, 500);
}

console.log('[wpp-create] Integration saved:', insertedIntegration.id);
```

**Добавить проверку UPDATE:**

Строки 181-188:
```typescript
// БЫЛО:
await supabaseClient
  .from('messenger_integrations')
  .update({...})
  .eq('id', existingIntegration.id);

// СТАНЕТ:
const { error: updateError } = await supabaseClient
  .from('messenger_integrations')
  .update({
    settings: { ...settings, ...newSettings },
    updated_at: new Date().toISOString(),
  })
  .eq('id', existingIntegration.id);

if (updateError) {
  console.error('[wpp-create] Failed to update integration:', updateError);
  return errorResponse('Failed to update integration: ' + updateError.message, 500);
}

console.log('[wpp-create] Integration updated:', existingIntegration.id);
```

#### 2. Добавить логирование в `wpp-qr`

Для отладки добавить более детальные логи:
```typescript
// После поиска интеграции:
console.log('[wpp-qr] Integration found:', integration?.id, 'settings keys:', Object.keys(integration?.settings || {}));

// После получения QR:
console.log('[wpp-qr] QR result:', qr ? `received (${qr.length} chars)` : 'null');
```

---

### Порядок действий

1. Исправить `wpp-create/index.ts` - добавить проверку ошибок INSERT/UPDATE
2. Добавить поле `webhook_key` при создании интеграции
3. Улучшить логирование в `wpp-qr/index.ts`
4. GitHub Actions развернёт изменения
5. Перезапустить functions и проверить

---

### Проверка после деплоя

```bash
cd /home/automation/supabase-project
docker compose restart functions
sleep 5

# Проверить что интеграция создаётся
docker logs supabase-edge-functions 2>&1 | grep -i "wpp-create" | grep -i "integration" | tail -10

# Проверить БД
docker exec -it supabase-db psql -U postgres -d postgres -c \
  "SELECT id, provider, is_active, settings->>'wppAccountNumber' as session FROM messenger_integrations WHERE provider = 'wpp';"
```
