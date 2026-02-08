

# План исправления ошибки добавления второго WhatsApp номера

## Диагноз проблемы

При попытке добавить второй WhatsApp номер возникает ошибка:
```
Failed to get initial token: 403 {"error":"Invalid API key"}
```

**Причина:** WPP Platform (`msg.academyos.ru`) создаёт нового клиента через `/api/integrations/wpp/create`, возвращает `apiKey`, но этот ключ сразу не проходит валидацию при попытке получить JWT токен.

Возможные причины на стороне WPP Platform:
1. API ключ активируется с задержкой (race condition)
2. Платформа возвращает ключ старого клиента вместо нового
3. Ограничение: один клиент на организацию

## Решение

Добавить **retry с задержкой** при получении начального токена, а также улучшить логирование для диагностики.

### Шаг 1: Добавить retry для getInitialToken

**Файл:** `supabase/functions/_shared/wpp.ts`

```typescript
static async getInitialToken(
  baseUrl: string, 
  apiKey: string, 
  maxRetries = 3
): Promise<{ token: string; expiresAt: number }> {
  const url = `${baseUrl.replace(/\/+$/, '')}/auth/token`;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[WppMsgClient] Getting initial token, attempt ${attempt}/${maxRetries}`);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        const expiresAt = Date.now() + (data.expiresIn || 3600) * 1000;
        return { token: data.token, expiresAt };
      }
    }

    // Если это последняя попытка - выбросить ошибку
    if (attempt === maxRetries) {
      const text = await res.text();
      throw new Error(`Failed to get initial token: ${res.status} ${text}`);
    }

    // Ждём перед следующей попыткой (1, 2, 3 секунды)
    await new Promise(r => setTimeout(r, attempt * 1000));
  }
}
```

### Шаг 2: Улучшить логирование в wpp-create

**Файл:** `supabase/functions/wpp-create/index.ts`

Добавить логирование полного ответа от `createClient`:

```typescript
console.log('[wpp-create] New client created:', {
  session: newClient.session,
  apiKeyMasked: maskApiKey(newClient.apiKey),
  status: newClient.status,
});
```

### Шаг 3: Проверить WPP Platform

Если retry не поможет, нужно проверить на стороне WPP Platform (`msg.academyos.ru`):
1. Логи endpoint `/api/integrations/wpp/create` — возвращает ли уникальный apiKey?
2. Логи endpoint `/auth/token` — почему отклоняет новый ключ?
3. Проверить, поддерживает ли платформа несколько клиентов на одну организацию

## Файлы для изменения

1. `supabase/functions/_shared/wpp.ts` — добавить retry в `getInitialToken`
2. `supabase/functions/wpp-create/index.ts` — улучшить логирование

## Ожидаемый результат

- При временной задержке активации ключа — retry решит проблему
- При системной проблеме — логи покажут что именно возвращает платформа

## Альтернативный подход

Если WPP Platform не поддерживает несколько клиентов на одну организацию, нужно изменить архитектуру:
- Использовать один `apiKey` с несколькими сессиями/аккаунтами
- Или создавать виртуальные "суб-организации" для каждого номера

