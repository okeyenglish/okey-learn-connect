
## Диагностика и исправление проблем

### Проблема 1: Ошибка сборки PWA

**Суть**: `vite-plugin-pwa` с `injectManifest` требует буквальную строку `self.__WB_MANIFEST` для замены, но текущий код `self.__WB_MANIFEST ?? []` не распознаётся плагином.

**Решение**: Использовать отдельную переменную с последующим fallback:
```typescript
const manifest = self.__WB_MANIFEST;
precacheAndRoute(manifest ?? []);
```

---

### Проблема 2: Wappi Telegram webhook не находит организацию

**Причина**: Функция `telegram-webhook` ищет организацию по `profile_id` из payload через:
```typescript
.eq('settings->>profileId', profileId)
```

Но это работает только если:
1. Таблица `messenger_integrations` существует на self-hosted
2. Запись имеет `settings.profileId` = profile_id от Wappi

**Проверка**: URL `telegram-webhook/58bf91a64dafc3f423d85950` содержит Wappi profile_id как path-параметр, но функция его **не парсит из URL** — она полагается только на payload.

**Решение**: Добавить парсинг `profile_id` из URL path как запасной вариант (по аналогии с `whatsapp-webhook`):
```typescript
// Извлечь profile_id из URL path: /telegram-webhook/{profile_id}
const url = new URL(req.url);
const pathParts = url.pathname.split('/');
const urlProfileId = pathParts[pathParts.length - 1];

// Использовать profile_id из payload, или из URL как fallback
const effectiveProfileId = message.profile_id || urlProfileId;
```

---

### Проблема 3: Telegram-send не отправляет сообщения

**Причина**: Ошибка на скриншоте показывает что Wappi API возвращает ошибку. Это может быть связано с:
1. Неверным `recipient` (нет telegram_chat_id, telegram_user_id или телефона)
2. Неверными credentials (profileId / apiToken)
3. Отключенной интеграцией

Исправление с fallback на телефон уже сделано — нужно протестировать.

---

## План изменений

### Файл: `src/sw.ts`
**Строки 23-25** — исправить injection point для PWA:
```typescript
// CRITICAL: vite-plugin-pwa injectManifest requires `self.__WB_MANIFEST` as a literal.
// Store in variable first, then apply fallback.
const manifest = self.__WB_MANIFEST;
precacheAndRoute(manifest ?? []);
```

### Файл: `supabase/functions/telegram-webhook/index.ts`
**Строки 12-53** — добавить парсинг profile_id из URL path:

1. После CORS handling, извлечь profile_id из URL:
```typescript
// Extract profile_id from URL path if present: /telegram-webhook/{profile_id}
const url = new URL(req.url);
const pathParts = url.pathname.split('/');
const urlProfileId = pathParts[pathParts.length - 1];
const isValidUrlProfileId = urlProfileId && urlProfileId !== 'telegram-webhook' && urlProfileId.length >= 8;
```

2. В функции `processMessage` использовать URL profile_id как fallback:
```typescript
// Use profile_id from message payload, or from URL path as fallback
const effectiveProfileId = message.profile_id || (isValidUrlProfileId ? urlProfileId : null);
if (!effectiveProfileId) {
  console.error('[telegram-webhook] No profile_id in payload or URL');
  return;
}
```

3. Передать `urlProfileId` в функцию обработки через closure или параметр.

---

## Технические детали

### Структура Wappi webhook payload
Wappi отправляет массив `messages`, где каждое сообщение содержит `profile_id`:
```json
{
  "messages": [{
    "wh_type": "incoming_message",
    "profile_id": "58bf91a64dafc3f423d85950",
    "from": "123456789",
    "chatId": "123456789",
    ...
  }]
}
```

### Почему URL profile_id нужен как fallback
Если payload некорректный или profile_id отсутствует, можно использовать ID из URL для routing.

---

## Тестирование после изменений

1. **Build**: Убедиться что PWA собирается без ошибок
2. **Webhook**: Отправить тестовое сообщение в Telegram → проверить логи на self-hosted
3. **Отправка**: Отправить сообщение клиенту из CRM → проверить что уходит

---

## Self-hosted обновление

После деплоя изменений — скопировать функции на self-hosted:
```bash
# Скопировать telegram-webhook и telegram-send
docker compose restart functions
```
