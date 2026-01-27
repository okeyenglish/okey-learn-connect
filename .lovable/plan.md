
# План исправления Push-уведомлений с Lovable Cloud Fallback

## Выявленные проблемы

### Проблема 1: Нет таблицы push_subscriptions в Lovable Cloud
Edge functions `push-subscription-save` и `push-subscription-delete` пытаются работать с таблицей, которой не существует.

### Проблема 2: portal-push-send не шифрует payload
Web Push API требует шифрование RFC 8291 (ECDH + AES-GCM). Текущая реализация отправляет plaintext, что игнорируется push-сервисами.

### Проблема 3: Отправка push не имеет fallback
Вебхуки и триггеры вызывают self-hosted напрямую без fallback на Lovable Cloud.

---

## План исправления

### Шаг 1: Создать таблицу push_subscriptions в Lovable Cloud

```sql
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- RLS policies
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions"
ON public.push_subscriptions
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all"
ON public.push_subscriptions
FOR ALL
TO service_role
USING (true);
```

### Шаг 2: Исправить portal-push-send с полным шифрованием RFC 8291

Скопировать логику шифрования из `send-push-notification/index.ts`:

**Файл: `supabase/functions/portal-push-send/index.ts`**

Добавить функции:
- `base64UrlToUint8Array()` - декодирование base64url
- `uint8ArrayToBase64Url()` - кодирование base64url  
- `generateVapidJwt()` - генерация VAPID JWT с ES256
- `hkdf()` - HKDF для деривации ключей
- `encryptPayload()` - шифрование ECDH + AES-GCM
- `buildEncryptedBody()` - построение aes128gcm body
- `sendWebPush()` - полноценная отправка с шифрованием

### Шаг 3: Создать send-push-notification в Lovable Cloud

Для CRM managers нужна отдельная функция `send-push-notification` в Lovable Cloud, которая:
- Читает подписки из `push_subscriptions` таблицы
- Отправляет push с шифрованием
- Поддерживает отправку нескольким пользователям

**Файл: `supabase/functions/send-push-notification/index.ts`**

### Шаг 4: Добавить fallback в вебхуки для отправки push

Обновить helper `sendPushNotification` чтобы использовать fallback:

**Файл: `src/lib/pushApiWithFallback.ts`**

Добавить функцию для отправки push с fallback:

```typescript
export async function sendPushWithFallback(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<PushApiResponse> {
  // Try self-hosted first
  const response = await pushApiWithFallback('send-push-notification', {
    userId,
    payload,
  });
  return response;
}
```

---

## Изменяемые файлы

| Файл | Изменения |
|------|-----------|
| `supabase/functions/portal-push-send/index.ts` | Полная реализация Web Push с шифрованием RFC 8291 |
| `supabase/functions/send-push-notification/index.ts` | Скопировать с self-hosted для CRM fallback |
| SQL миграция | Создать таблицу `push_subscriptions` |
| `src/lib/pushApiWithFallback.ts` | Добавить `sendPushWithFallback()` helper |

---

## Технические детали шифрования RFC 8291

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Web Push Encryption Flow                     │
├─────────────────────────────────────────────────────────────────┤
│  1. Generate ephemeral ECDH key pair (P-256)                   │
│  2. Import client public key (p256dh from subscription)        │
│  3. Derive shared secret via ECDH                              │
│  4. Generate random salt (16 bytes)                            │
│  5. Derive IKM using HKDF(auth_secret, shared_secret, info)    │
│  6. Derive CEK and Nonce using HKDF(salt, ikm, ...)           │
│  7. Pad payload + delimiter (0x02)                             │
│  8. Encrypt with AES-128-GCM                                   │
│  9. Build aes128gcm body: salt | rs | idlen | keyid | ciphertext│
│ 10. Generate VAPID JWT (ES256 signature)                       │
│ 11. POST to endpoint with proper headers                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Ожидаемый результат

1. Push-подписки сохраняются в Lovable Cloud когда self-hosted недоступен
2. Push-уведомления отправляются через Lovable Cloud как fallback
3. Payload правильно шифруется по RFC 8291
4. Push приходят на устройства пользователей
