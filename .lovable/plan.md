

## Исправление: Правильный endpoint для отключения WPP сессии

### Проблема
Метод `deleteAccount` использует несуществующий эндпоинт `DELETE /api/accounts/{number}`.

Правильный эндпоинт:
```
POST /internal/session/{sessionId}/stop
```

---

### Технические изменения

#### `supabase/functions/_shared/wpp.ts`

**Строки 322-331** - изменить метод `deleteAccount`:

```typescript
// БЫЛО:
/**
 * Delete/disconnect an account
 * DELETE /api/accounts/{number}
 */
async deleteAccount(number: string): Promise<void> {
  const url = `${this.baseUrl}/api/accounts/${encodeURIComponent(number)}`;
  
  await this._fetch(url, { method: 'DELETE' });
  console.log(`[WppMsgClient] ✓ Account ${number} deleted`);
}

// СТАНЕТ:
/**
 * Stop/disconnect a session
 * POST /internal/session/{sessionId}/stop
 */
async deleteAccount(sessionId: string): Promise<void> {
  const url = `${this.baseUrl}/internal/session/${encodeURIComponent(sessionId)}/stop`;
  
  console.log(`[WppMsgClient] Stopping session: ${sessionId}`);
  await this._fetch(url, { method: 'POST' });
  console.log(`[WppMsgClient] ✓ Session ${sessionId} stopped`);
}
```

---

### Проверка после деплоя

```bash
# Перезапустить functions
docker compose restart functions
sleep 5

# Проверить логи при отключении
docker logs supabase-edge-functions 2>&1 | grep -i "Stopping session" | tail -5
```

