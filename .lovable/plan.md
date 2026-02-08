

# План: Обновление wpp-create на self-hosted для поддержки нескольких номеров

## Текущая ситуация

- Все WPP запросы идут на **self-hosted** (`api.academyos.ru`), а не на Lovable Cloud
- Изменения с `add_new` и `subOrgId` сделаны **только в Lovable Cloud** и НЕ применены на self-hosted
- Self-hosted возвращает **504 timeout** потому что:
  1. Старый код вызывает `createClient(orgId)` с тем же orgId
  2. WPP Platform возвращает существующий `apiKey`
  3. Попытка запустить новую сессию с тем же ключом приводит к конфликту/timeout

## Решение

Необходимо **синхронизировать код на self-hosted** с актуальной версией из Lovable.

### Шаг 1: Скопировать обновлённые файлы на self-hosted сервер

**Файлы для обновления:**

1. `supabase/functions/wpp-create/index.ts` — добавлена логика `add_new` и `createNewWhatsAppNumber()` с уникальным `subOrgId`

2. `supabase/functions/_shared/wpp.ts` — добавлен retry для `getInitialToken()`

### Шаг 2: Перезапустить edge functions контейнер

```bash
cd /home/automation/supabase-project
docker compose restart functions
```

## Ключевые изменения в коде

### wpp-create/index.ts — новая логика для add_new

```typescript
// При add_new: true — сразу переходим к созданию нового номера
if (addNew) {
  console.log('[wpp-create] add_new=true: creating new WhatsApp number');
  return await createNewWhatsAppNumber(supabaseClient, orgId, WPP_BASE_URL, WPP_SECRET);
}

// Новая функция createNewWhatsAppNumber:
async function createNewWhatsAppNumber(...) {
  // Генерируем уникальный subOrgId для каждого нового номера
  const integrationUuid = crypto.randomUUID();
  const subOrgId = `${orgId}__wpp__${integrationUuid.substring(0, 8)}`;
  
  // Создаём клиента с уникальным subOrgId
  const newClient = await WppMsgClient.createClient(baseUrl, secret, subOrgId);
  
  // Сохраняем в settings
  const newSettings = {
    wppApiKey: newClient.apiKey,
    wppAccountNumber: newClient.session,
    wppSubOrgId: subOrgId,  // ← Уникальный идентификатор
    wppJwtToken: jwtToken,
    wppJwtExpiresAt: jwtExpiresAt,
  };
  
  // ВСЕГДА создаём новую запись в messenger_integrations
  await supabaseClient.from('messenger_integrations').insert({...});
}
```

### _shared/wpp.ts — retry для getInitialToken

```typescript
static async getInitialToken(baseUrl: string, apiKey: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {...});
    if (res.ok) return data;
    
    if (attempt === maxRetries) throw new Error(...);
    
    // Ждём перед следующей попыткой
    await new Promise(r => setTimeout(r, attempt * 1000));
  }
}
```

## Команды для выполнения на сервере

```bash
# 1. Перейти в папку с функциями
cd /home/automation/supabase-project/volumes/functions

# 2. Обновить wpp-create/index.ts и _shared/wpp.ts
# (вручную скопировать содержимое файлов)

# 3. Перезапустить контейнер
cd /home/automation/supabase-project
docker compose restart functions

# 4. Проверить логи
docker compose logs -f functions --tail=100
```

## Ожидаемый результат

После обновления self-hosted:
- Первый номер: `orgId` → `apiKey1`
- Второй номер: `orgId__wpp__abc123` → `apiKey2` (уникальный)
- Каждый номер получает уникальный apiKey
- 504 timeout исчезает, QR-код для второго номера появляется

