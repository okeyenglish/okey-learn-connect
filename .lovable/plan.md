

# Fix: Ошибки при массовой перепривязке филиалов

## Проблема
Все номера показывают ошибку при перепривязке. Наиболее вероятная причина: запрос к таблице `client_phone_numbers` возвращает HTML-страницу ошибки (если таблица не существует на self-hosted) или некорректный ответ, вызывая исключение при вызове `.json()`. Также отсутствует обработка HTTP-ошибок и логирование, что скрывает реальную причину.

## Что будет сделано

### Файл: `src/components/admin/BulkBranchReassign.tsx`

1. **Обернуть запрос к `client_phone_numbers` в try/catch** — если таблица не существует, сразу переходить к fallback поиску в `clients.phone`

2. **Добавить проверку `response.ok` перед вызовом `.json()`** — предотвратить исключения при HTML-ответах от PostgREST

3. **Добавить `console.log` для отладки** — логировать статус ответов и найденные/ненайденные номера

4. **Добавить фильтр `is_active`** в запрос к `clients` — не привязывать филиал к удаленным клиентам

5. **Логировать ошибку PATCH-запроса** — чтобы видеть причину ошибки обновления

### Изменения в коде (строки 102-158):

```typescript
await Promise.all(batch.map(async (phone) => {
  try {
    const last10 = phone.slice(-10);
    let clientId: string | null = null;

    // 1. Try client_phone_numbers (may not exist on self-hosted)
    try {
      const phoneNumRes = await fetch(
        `${SELF_HOSTED_URL}/rest/v1/client_phone_numbers?phone=ilike.%25${last10}%25&select=client_id&limit=1`,
        { headers: { 'apikey': SELF_HOSTED_ANON_KEY, 'Authorization': `Bearer ${SELF_HOSTED_ANON_KEY}` } }
      );
      if (phoneNumRes.ok) {
        const phoneNums = await phoneNumRes.json();
        if (Array.isArray(phoneNums) && phoneNums.length > 0 && phoneNums[0].client_id) {
          clientId = phoneNums[0].client_id;
        }
      }
    } catch (e) {
      console.warn('[BulkBranch] client_phone_numbers lookup failed:', e);
    }

    // 2. Fallback: search clients.phone
    if (!clientId) {
      const searchRes = await fetch(
        `${SELF_HOSTED_URL}/rest/v1/clients?phone=ilike.%25${last10}%25&is_active=eq.true&select=id&limit=1`,
        { headers: { 'apikey': SELF_HOSTED_ANON_KEY, 'Authorization': `Bearer ${SELF_HOSTED_ANON_KEY}` } }
      );
      if (searchRes.ok) {
        const clients = await searchRes.json();
        if (Array.isArray(clients) && clients.length > 0) {
          clientId = clients[0].id;
        }
      }
    }

    if (!clientId) {
      res.notFound++;
      res.notFoundPhones.push(phone);
      return;
    }

    // 3. Update branch
    const patchRes = await fetch(...);
    if (patchRes.ok) {
      res.updated++;
    } else {
      const errText = await patchRes.text();
      console.error(`[BulkBranch] PATCH failed for ${clientId}:`, patchRes.status, errText);
      res.errors++;
    }
  } catch (e) {
    console.error('[BulkBranch] Error processing phone:', phone, e);
    res.errors++;
  }
}));
```

Основное изменение -- обертка запроса к `client_phone_numbers` в отдельный try/catch и проверка `response.ok`, чтобы ошибки одной таблицы не ломали весь процесс.

