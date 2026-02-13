

# Исправление RPC параметров в telegram-webhook

## Диагноз

RPC-вызов `find_or_create_telegram_client` в коде ВСЕГДА падает из-за несовпадения параметров:

| Код передаёт | Функция в БД ожидает |
|---|---|
| `p_org_id` | `p_organization_id` |
| `p_telegram_user_id` | `p_telegram_user_id` (ok) |
| `p_telegram_chat_id` | -- (нет такого) |
| `p_name` | `p_name` (ok) |
| `p_username` | -- (нет такого) |
| `p_avatar_url` | -- (нет такого) |
| `p_phone` | `p_phone` (ok) |

Результат: RPC падает -> fallback на legacy -> legacy работает, но клиент создаётся без явного `telegram_user_id` в некоторых случаях или создаётся корректно, но пользователь искал по телефону, а телефон null (бот не знает номер).

## Почему клиент не найден по телефону

Telegram-бот **не получает** номер телефона отправителя. Бот видит только `user_id`, `chat_id`, `first_name`, `username`. Поэтому клиент создан с `phone = NULL`. Поиск `WHERE phone LIKE '%79852615056'` ничего не вернёт.

## План исправления

### 1. Исправить RPC-вызов в `telegram-webhook/index.ts`

Привести параметры в соответствие с функцией в БД:

```
Было:
  supabase.rpc('find_or_create_telegram_client', {
    p_org_id: organizationId,
    p_telegram_user_id: telegramUserId,
    p_telegram_chat_id: telegramChatId,
    p_name: finalName,
    p_username: username || null,
    p_avatar_url: avatarUrl || null,
    p_phone: finalPhone
  });

Станет:
  supabase.rpc('find_or_create_telegram_client', {
    p_organization_id: organizationId,
    p_telegram_user_id: String(telegramUserId),
    p_name: finalName || 'Telegram User',
    p_phone: finalPhone
  });
```

Убираем лишние параметры (`p_telegram_chat_id`, `p_username`, `p_avatar_url`) которых нет в сигнатуре функции. Параметр `p_org_id` заменяем на `p_organization_id`.

### 2. После RPC — обновить telegram_chat_id отдельно

Поскольку RPC-функция не принимает `telegram_chat_id`, обновим его отдельно после создания клиента:

```typescript
// После успешного RPC, обновить chat_id и avatar
await supabase
  .from('clients')
  .update({ 
    telegram_chat_id: telegramChatId,
    telegram_avatar_url: avatarUrl || undefined
  })
  .eq('id', clientId);
```

### 3. Добавить подробное логирование пути

Чтобы в будущем было понятно какой путь выполнился:

```typescript
console.log('[findOrCreateClient] RPC success, clientId:', clientId);
// или
console.log('[findOrCreateClient] RPC failed, falling back to legacy:', rpcError.message);
```

## Файлы для изменения

- `supabase/functions/telegram-webhook/index.ts` -- исправить RPC параметры (строки 1030-1038), добавить update chat_id после RPC (после строки 1044)

## Ожидаемый результат

1. RPC-вызов перестанет падать -> клиент создаётся атомарно с `telegram_user_id`
2. `telegram_chat_id` обновляется отдельным запросом после создания
3. При ответе из CRM, `telegram-send` найдёт `telegram_user_id` и отправит по ID

