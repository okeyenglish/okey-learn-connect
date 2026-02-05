
## План: Исправить обработку истёкшего JWT токена в WPP клиенте

### Проблема
Когда JWT токен истекает во время отправки сообщения, метод `_fetch` возвращает ошибку `HTTP 401: Invalid token` вместо того, чтобы автоматически обновить токен и повторить запрос.

### Корневая причина
В файле `supabase/functions/_shared/wpp.ts` метод `_fetch` не имеет логики retry при получении 401 ошибки. Токен может истечь между проверкой валидности и фактическим запросом.

### Решение
Добавить автоматический retry в метод `_fetch`:

**Файл:** `supabase/functions/_shared/wpp.ts`
**Метод:** `_fetch` (строки 76-121)

**Текущая логика:**
```text
┌─────────────────────┐
│ _fetch()            │
├─────────────────────┤
│ 1. getToken()       │
│ 2. fetch()          │
│ 3. if 401 → ERROR   │ ← Проблема: нет retry
└─────────────────────┘
```

**Новая логика:**
```text
┌─────────────────────────────┐
│ _fetch() with retry         │
├─────────────────────────────┤
│ 1. getToken()               │
│ 2. fetch()                  │
│ 3. if 401:                  │
│    a. clear cached token    │
│    b. getToken() (refresh)  │
│    c. retry fetch() once    │
│ 4. return result            │
└─────────────────────────────┘
```

### Изменения в коде

**Файл:** `supabase/functions/_shared/wpp.ts`

Обновить метод `_fetch` для добавления retry при 401:

```typescript
private async _fetch(
  url: string,
  init: RequestInit = {},
  authRequired = true,
  _isRetry = false  // Флаг для предотвращения бесконечного retry
): Promise<any> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), this.timeoutMs);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(init.headers as Record<string, string> || {}),
    };

    if (authRequired) {
      const token = await this.getToken();
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log(`[WppMsgClient] ${init.method || 'GET'} ${url}`);

    const res = await fetch(url, {
      ...init,
      headers,
      signal: ac.signal,
    });

    console.log(`[WppMsgClient] Response: ${res.status} ${res.statusText}`);

    const text = await res.text();
    
    if (!res.ok) {
      // Если 401 и это не retry - попробовать обновить токен и повторить
      if (res.status === 401 && authRequired && !_isRetry) {
        console.log('[WppMsgClient] Got 401, clearing token and retrying...');
        this.cachedToken = null;
        this._tokenExpiry = 0;
        clearTimeout(t);
        return this._fetch(url, init, authRequired, true);
      }
      
      console.error(`[WppMsgClient] Error body: ${text.substring(0, 500)}`);
      throw new Error(`HTTP ${res.status}: ${text.substring(0, 200)}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } finally {
    clearTimeout(t);
  }
}
```

### После внесения изменений

Скопируйте обновлённый файл на сервер:

```bash
cd /home/automation/supabase-project

# Скопировать обновлённый wpp.ts
cat > volumes/functions/_shared/wpp.ts << 'WPPEOF'
[содержимое файла]
WPPEOF

# Перезапустить функции
docker compose restart functions
```

### Ожидаемый результат

После исправления:
- При получении 401 токен будет автоматически обновлён
- Запрос будет повторён с новым токеном
- Сообщения будут отправляться без ошибок авторизации
