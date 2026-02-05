

## Исправление: Правильный endpoint для установки webhook сессии

### Проблема
Метод `registerWebhook` использует старый endpoint:
```
POST /api/webhooks/{number}
```

Правильный endpoint (из твоей WPP Platform):
```
POST /internal/session/{sessionId}/webhook
body: { url: "..." }
```

---

### Технические изменения

#### `supabase/functions/_shared/wpp.ts`

**Строки 334-347** - обновить метод `registerWebhook`:

```typescript
// БЫЛО:
/**
 * Register webhook for account
 * POST /api/webhooks/{number} { url }
 */
async registerWebhook(number: string, webhookUrl: string): Promise<void> {
  const url = `${this.baseUrl}/api/webhooks/${encodeURIComponent(number)}`;
  
  await this._fetch(url, {
    method: 'POST',
    body: JSON.stringify({ url: webhookUrl }),
  });
  
  console.log(`[WppMsgClient] ✓ Webhook registered for ${number}`);
}

// СТАНЕТ:
/**
 * Set webhook for a session
 * POST /internal/session/{sessionId}/webhook
 */
async registerWebhook(sessionId: string, webhookUrl: string): Promise<void> {
  const url = `${this.baseUrl}/internal/session/${encodeURIComponent(sessionId)}/webhook`;
  
  console.log(`[WppMsgClient] Setting webhook for session ${sessionId}: ${webhookUrl}`);
  await this._fetch(url, {
    method: 'POST',
    body: JSON.stringify({ url: webhookUrl }),
  });
  
  console.log(`[WppMsgClient] ✓ Webhook registered for session ${sessionId}`);
}
```

---

### Что это исправит

После этого изменения:
- `wpp-create` и `wpp-provision` будут корректно регистрировать webhook для каждой сессии
- WPP Platform будет знать куда отправлять события для сессии `0000000000001`, `0000000000002` и т.д.

### Пример потока

```
1. Lovable создаёт сессию → получает session = "0000000000001"
2. Lovable вызывает POST /internal/session/0000000000001/webhook
   body: { url: "https://api.academyos.ru/functions/v1/wpp-webhook?account=0000000000001" }
3. WPP Platform сохраняет: webhooks["0000000000001"] = "https://..."
4. При событии → sendWebhook("0000000000001", payload) → отправка на Lovable
```

