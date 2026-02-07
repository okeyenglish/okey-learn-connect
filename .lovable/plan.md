
# Переключение Telegram CRM на self-hosted Edge Functions

## Проблема

Edge Functions `telegram-crm-send-code` и `telegram-crm-verify-code` вызываются через Lovable Cloud (`supabase.functions.invoke()`), но сервер `tg.academyos.ru` доступен **только с вашего сервера** (он на том же хосте или во внутренней сети). Lovable Cloud не может к нему достучаться — получает `Connection refused`.

```
Lovable Cloud Edge Functions → tg.academyos.ru → ❌ Connection refused

Self-hosted Edge Functions → tg.academyos.ru → ✅ OK
```

## Решение

Переключить компонент `TelegramCrmConnectDialog` с Lovable Cloud на self-hosted API (`api.academyos.ru`), используя существующий хелпер `selfHostedPost()`.

## Что будет изменено

### Файл: `src/components/admin/integrations/TelegramCrmConnectDialog.tsx`

**Было:**
```typescript
import { supabase } from '@/integrations/supabase/client';
// ...
const { data, error } = await supabase.functions.invoke('telegram-crm-send-code', {
  body: { phone: cleanedPhone },
});
```

**Станет:**
```typescript
import { selfHostedPost } from '@/lib/selfHostedApi';
// ...
const response = await selfHostedPost<{
  success: boolean;
  phone_hash?: string;
  error?: string;
}>('telegram-crm-send-code', { phone: cleanedPhone });

if (!response.success) {
  throw new Error(response.error || 'Ошибка отправки кода');
}
```

### Изменения по шагам

1. **Заменить импорт** — вместо `supabase` использовать `selfHostedPost`

2. **handleSendCode** — вызов через self-hosted:
   - `selfHostedPost('telegram-crm-send-code', { phone })`
   - Проверка `response.success` и `response.data`

3. **handleVerifyCode** — вызов через self-hosted:
   - `selfHostedPost('telegram-crm-verify-code', { phone, code, phone_hash, name })`
   - Получение `webhook_key` из ответа

4. **Обработка ошибок** — адаптация под формат `ApiResponse`

## Зависимости

Функции `telegram-crm-send-code` и `telegram-crm-verify-code` уже задеплоены на self-hosted Supabase (через sync или вручную). Если нет — нужно задеплоить.

## Ожидаемый результат

- Отправка кода будет работать (запрос пойдёт через `api.academyos.ru` → `tg.academyos.ru`)
- Верификация кода создаст интеграцию и вернёт `webhook_key`
- Webhook URL будет показан сразу после успешной верификации

## Технические детали

`selfHostedPost` автоматически:
- Добавляет JWT токен пользователя (авторизация)
- Устанавливает `apikey` header
- Делает retry при ошибках 5xx
- Возвращает типизированный `ApiResponse<T>`
