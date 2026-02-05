

## Проблема: QR не доходит до UI

### Текущая ситуация

1. **WPP Platform работает корректно** - логи показывают "QR GENERATED FOR: 0000000000004"
2. **UI polling получает** `{ qr: false, status: 'disconnected' }` - значит QR не возвращается
3. **Цепочка вызовов:**
   - UI → `wppQr(session)` → `selfHostedGet('wpp-qr?session=...')`
   - `wpp-qr` → `wpp.getAccountQr(number)` → `GET /api/accounts/{number}/qr`
   - Где-то здесь QR теряется

### Вероятные причины

1. **Эндпоинт `/api/accounts/{number}/qr` возвращает данные в другом формате**
   - Код ожидает `{ qr: '...' }`, но может быть `{ qrCode: '...' }` или `{ data: { qr: '...' } }`

2. **Ошибка авторизации при вызове WPP Platform API**
   - JWT токен может быть невалидным

3. **Таймаут или сетевая ошибка** между Edge Function и WPP Platform

### План исправления

#### 1. Добавить детальное логирование в `wpp-qr`

Файл: `supabase/functions/wpp-qr/index.ts`

Заменить вызов `getAccountQr` на прямой запрос с логированием:

```typescript
// Вместо:
const qr = await wpp.getAccountQr(wppAccountNumber);

// Сделать:
const qrUrl = `${WPP_BASE_URL}/api/accounts/${encodeURIComponent(wppAccountNumber)}/qr`;
console.log('[wpp-qr] Fetching QR from:', qrUrl);

const token = await wpp.getToken();
const qrResponse = await fetch(qrUrl, {
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  },
});

console.log('[wpp-qr] QR API response status:', qrResponse.status);
const qrData = await qrResponse.text();
console.log('[wpp-qr] QR API raw response:', qrData.substring(0, 500));

let qr: string | null = null;
try {
  const parsed = JSON.parse(qrData);
  // Попробовать разные поля
  qr = parsed.qr || parsed.qrCode || parsed.qrcode || parsed.data?.qr || null;
  console.log('[wpp-qr] Parsed QR:', qr ? `found (${qr.length} chars)` : 'null');
} catch (e) {
  console.error('[wpp-qr] Failed to parse QR response:', e);
}
```

#### 2. Добавить логирование ошибок в UI

Файл: `src/components/admin/integrations/WppConnectPanel.tsx`

В polling убрать catch который скрывает ошибки:

```typescript
// Текущий код скрывает ошибки:
wppQr(session).catch(() => ({ success: false, qr: null }))

// Заменить на:
wppQr(session).catch((err) => {
  console.error('[WppConnectPanel] QR fetch error:', err);
  return { success: false, qr: null };
})
```

#### 3. Проверить формат ответа WPP Platform API

На сервере WPP Platform проверить какой формат возвращает `/api/accounts/{number}/qr`:

```bash
curl -X GET "http://localhost:3000/api/accounts/0000000000004/qr" \
  -H "Authorization: Bearer <JWT>" | jq .
```

#### 4. Обновить метод `getAccountQr` в SDK

Файл: `supabase/functions/_shared/wpp.ts`

Если формат ответа отличается, обновить парсинг:

```typescript
async getAccountQr(number: string): Promise<string | null> {
  const url = `${this.baseUrl}/api/accounts/${encodeURIComponent(number)}/qr`;
  
  try {
    const result = await this._fetch(url, { method: 'GET' });
    console.log('[WppMsgClient] QR response keys:', Object.keys(result));
    
    // Поддержка разных форматов ответа
    const qr = result.qr || result.qrCode || result.qrcode || result.data?.qr || null;
    console.log('[WppMsgClient] QR extracted:', qr ? 'yes' : 'no');
    return qr;
  } catch (error) {
    console.error(`[WppMsgClient] Get QR error:`, error);
    return null;
  }
}
```

### Технические изменения

#### Файл 1: `supabase/functions/wpp-qr/index.ts`
- Добавить детальное логирование HTTP ответа от WPP Platform
- Поддержка разных форматов ответа (`qr`, `qrCode`, `qrcode`, `data.qr`)

#### Файл 2: `src/components/admin/integrations/WppConnectPanel.tsx`
- Логировать ошибки вместо их подавления в catch

#### Файл 3: `supabase/functions/_shared/wpp.ts`
- Обновить `getAccountQr()` для поддержки разных форматов

### После деплоя

```bash
# Скопировать обновленные функции
rsync -avz ./supabase/functions/wpp-qr/ root@185.23.35.9:/home/automation/supabase-project/volumes/functions/wpp-qr/
rsync -avz ./supabase/functions/_shared/ root@185.23.35.9:/home/automation/supabase-project/volumes/functions/_shared/

# Рестарт
docker compose restart functions

# Проверить логи
docker compose logs functions --tail 100 | grep wpp-qr
```

### Ожидаемый результат

После этих изменений:
1. Логи покажут точную причину почему QR не возвращается
2. Если проблема в формате - автоматически исправится поддержкой разных полей
3. UI будет логировать ошибки для отладки

