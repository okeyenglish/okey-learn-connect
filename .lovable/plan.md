

## План: Исправление сохранения JWT токена для WPP

### Текущая проблема

QR-код не отображается потому что JWT токен не сохраняется в базу данных. Это происходит в двух случаях:

1. **wpp-create для существующего клиента** - создаётся WppMsgClient, получается JWT через apiKey, но токен НЕ сохраняется в `messenger_integrations.settings`

2. **wpp-qr/wpp-status** - неправильное условие `wpp.tokenExpiry > 0` проверяется ДО вызова `getToken()`, поэтому токен не обновляется в базе

### Архитектура исправления

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                   wpp-create (существующий клиент)                      │
├─────────────────────────────────────────────────────────────────────────┤
│  БЫЛО:                                                                  │
│  1. Создаём WppMsgClient({ apiKey })                                   │
│  2. Вызываем startAccount() → внутри getToken() получает JWT           │
│  3. JWT НЕ сохраняется ❌                                               │
│                                                                         │
│  СТАНЕТ:                                                                │
│  1. Создаём WppMsgClient({ apiKey, jwtToken?, jwtExpiresAt? })         │
│  2. Вызываем startAccount()                                            │
│  3. Получаем текущий токен через wpp.getToken()                        │
│  4. Сохраняем wppJwtToken + wppJwtExpiresAt в базу ✓                   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                   wpp-qr / wpp-status                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  БЫЛО:                                                                  │
│  const currentToken = wpp.tokenExpiry > 0 ? await wpp.getToken() : null │
│  // tokenExpiry = 0 до первого getToken() → токен не сохраняется ❌     │
│                                                                         │
│  СТАНЕТ:                                                                │
│  const currentToken = await wpp.getToken();  // Всегда получаем токен  │
│  if (currentToken !== wppJwtToken) {                                   │
│    // Сохраняем в базу ✓                                               │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Изменения в файлах

#### 1. `supabase/functions/wpp-create/index.ts`

**Строки 80-143** - добавить сохранение JWT для существующего клиента:

```typescript
// После строки 86 (создание WppMsgClient)
const wpp = new WppMsgClient({
  baseUrl: WPP_BASE_URL,
  apiKey: settings.wppApiKey,
  jwtToken: settings.wppJwtToken,     // ← Добавить
  jwtExpiresAt: settings.wppJwtExpiresAt, // ← Добавить
});

// После получения результата (startAccount или getAccountStatus)
// Перед return добавить сохранение токена:
const currentToken = await wpp.getToken();
if (currentToken !== settings.wppJwtToken) {
  console.log('[wpp-create] Saving JWT token for existing integration');
  await supabaseClient
    .from('messenger_integrations')
    .update({
      settings: { 
        ...settings, 
        wppJwtToken: currentToken, 
        wppJwtExpiresAt: wpp.tokenExpiry 
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', existingIntegration.id);
}
```

#### 2. `supabase/functions/wpp-qr/index.ts`

**Строка 123** - убрать неправильное условие:

```typescript
// БЫЛО:
const currentToken = wpp.tokenExpiry > 0 ? await wpp.getToken() : null;

// СТАНЕТ:
const currentToken = await wpp.getToken();
```

#### 3. `supabase/functions/wpp-status/index.ts`

**Строка 186** - аналогичное исправление:

```typescript
// БЫЛО:
const currentToken = wpp.tokenExpiry > 0 ? await wpp.getToken().catch(() => null) : null;

// СТАНЕТ:
const currentToken = await wpp.getToken().catch(() => null);
```

### Результат

После исправлений:
- JWT токен будет сохраняться в базу при первом получении
- При последующих запросах токен будет читаться из базы
- Если токен истёк - автоматически обновится и сохранится
- QR-код будет отображаться без ошибки `401 Invalid token`

### Порядок выполнения

1. Исправить `wpp-create/index.ts` - добавить сохранение JWT для существующего клиента
2. Исправить `wpp-qr/index.ts` - убрать условие `tokenExpiry > 0`
3. Исправить `wpp-status/index.ts` - убрать условие `tokenExpiry > 0`
4. Задеплоить edge functions
5. Удалить старую интеграцию (SQL: `DELETE FROM messenger_integrations WHERE provider='wpp'`)
6. Переподключить WhatsApp через UI

