

## План: Авто-рефреш JWT токенов для WPP интеграции

### Корневая причина проблемы

JWT токены WPP Platform живут **15 минут**. Текущая реализация:
1. `wpp-send` создаёт `WppMsgClient` с `apiKey` каждый раз
2. Не использует кешированный `wppJwtToken` из БД
3. При истечении apiKey (на стороне WPP Platform) — всё ломается

### Решение

Добавить единый паттерн работы с JWT токенами во всех WPP функциях:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Новый flow авторизации                        │
├─────────────────────────────────────────────────────────────────┤
│  1. Читаем wppJwtToken + wppJwtExpiresAt из БД                  │
│  2. Если токен валиден (expires > now + 60s) → используем       │
│  3. Если истёк → получаем новый через apiKey                    │
│  4. Если apiKey невалиден → ошибка + инструкция force_recreate  │
│  5. Сохраняем обновлённый токен обратно в БД                    │
└─────────────────────────────────────────────────────────────────┘
```

---

### Изменения в файлах

#### 1. `supabase/functions/wpp-send/index.ts`

**Текущий код (строки 104-116):**
```typescript
const settings = (integration?.settings || {}) as Record<string, any>
const wppApiKey = settings.wppApiKey
const wppAccountNumber = settings.wppAccountNumber
// ...
const wpp = new WppMsgClient({
  baseUrl: WPP_BASE_URL,
  apiKey: wppApiKey,
})
```

**Новый код:**
```typescript
const settings = (integration?.settings || {}) as Record<string, any>
const wppApiKey = settings.wppApiKey
const wppAccountNumber = settings.wppAccountNumber
let wppJwtToken = settings.wppJwtToken
let wppJwtExpiresAt = settings.wppJwtExpiresAt

// Проверяем валидность кешированного JWT (с буфером 60 сек)
const isTokenValid = wppJwtToken && wppJwtExpiresAt && Date.now() < wppJwtExpiresAt - 60_000

const wpp = new WppMsgClient({
  baseUrl: WPP_BASE_URL,
  apiKey: wppApiKey,
  jwtToken: isTokenValid ? wppJwtToken : undefined,
  jwtExpiresAt: isTokenValid ? wppJwtExpiresAt : undefined,
})

// После отправки — сохраняем обновлённый токен если изменился
// (добавить в конец функции)
```

**Добавить после успешной отправки (перед return):**
```typescript
// Сохраняем обновлённый JWT токен в БД если он изменился
try {
  const currentToken = await wpp.getToken()
  if (currentToken && currentToken !== wppJwtToken) {
    await supabase
      .from('messenger_integrations')
      .update({
        settings: {
          ...settings,
          wppJwtToken: currentToken,
          wppJwtExpiresAt: wpp.tokenExpiry,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id)
    console.log('[wpp-send] JWT token refreshed and saved')
  }
} catch (e) {
  console.warn('[wpp-send] Failed to save refreshed token:', e)
}
```

---

#### 2. `supabase/functions/_shared/wpp.ts`

Добавить обработку ошибки "Invalid API key" в методе `getToken()`:

**Текущий код (строки 150-153):**
```typescript
if (!res.ok) {
  const text = await res.text()
  throw new Error(`Failed to get token: ${res.status} ${text}`)
}
```

**Новый код:**
```typescript
if (!res.ok) {
  const text = await res.text()
  // Специальная обработка невалидного API key
  if (text.includes('Invalid API key') || res.status === 401) {
    throw new Error('INVALID_API_KEY: API key expired or invalid. Use force_recreate to generate new session.')
  }
  throw new Error(`Failed to get token: ${res.status} ${text}`)
}
```

---

#### 3. Аналогичные изменения в других WPP функциях

Применить тот же паттерн в:
- `wpp-status/index.ts` — уже использует кеширование (проверить)
- `wpp-webhook/index.ts` — добавить кеширование

---

### Техническая справка

| Компонент | Назначение |
|-----------|------------|
| `wppJwtToken` | Кешированный JWT токен в settings |
| `wppJwtExpiresAt` | Unix timestamp истечения (ms) |
| Буфер 60 сек | Обновляем токен за минуту до истечения |
| `INVALID_API_KEY` | Специальный код ошибки для UI |

---

### Порядок реализации

1. Обновить `wpp-send/index.ts` — добавить чтение/сохранение JWT из БД
2. Обновить `_shared/wpp.ts` — улучшить обработку ошибок
3. Проверить `wpp-status/index.ts` и `wpp-webhook/index.ts`
4. Задеплоить на сервер
5. Протестировать отправку сообщений

