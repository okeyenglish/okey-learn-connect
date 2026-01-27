

# План: Перенос хранения push-подписок на self-hosted сервер

## Проблема

Сейчас `usePushNotifications` сохраняет подписки в Lovable Cloud базу данных через `supabase.from('push_subscriptions')`, но Edge Function `send-push-notification` ищет подписки на self-hosted сервере `api.academyos.ru`. Это приводит к ошибке "Нет активных подписок".

## Решение

Заменить все операции с базой данных в `usePushNotifications` на вызовы через `selfHostedPost` к Edge Functions на self-hosted сервере.

## Изменения

### 1. Файл: `src/hooks/usePushNotifications.ts`

Основные изменения:

- **Добавить импорт**: `selfHostedPost`, `selfHostedDelete` из `@/lib/selfHostedApi`
- **Удаление старых подписок**: Заменить `supabase.from('push_subscriptions').delete()` на `selfHostedPost('push-subscription-delete', { userId: user.id })`
- **Сохранение новой подписки**: Заменить `supabase.from('push_subscriptions').upsert()` на `selfHostedPost('push-subscription-save', { ... })`
- **Удаление при отписке**: Заменить `supabase.delete()` на `selfHostedPost('push-subscription-delete', { userId, endpoint })`

### 2. Новый Edge Function: `supabase/functions/push-subscription-save/index.ts`

Эндпоинт для сохранения подписки:

```text
POST /push-subscription-save
Body: {
  user_id: string,
  endpoint: string,
  keys: { p256dh: string, auth: string },
  user_agent?: string
}

Логика:
1. Валидация JWT токена из Authorization header
2. Удаление старых подписок пользователя
3. Upsert новой подписки
4. Возврат { success: true }
```

### 3. Новый Edge Function: `supabase/functions/push-subscription-delete/index.ts`

Эндпоинт для удаления подписки:

```text
POST /push-subscription-delete
Body: {
  user_id: string,
  endpoint?: string  // если не указан - удаляет все подписки пользователя
}

Логика:
1. Валидация JWT токена
2. Удаление подписок по user_id (и endpoint, если указан)
3. Возврат { success: true, deleted: number }
```

### 4. Обновление `supabase/config.toml`

Добавить конфигурацию для новых функций:

```toml
[functions.push-subscription-save]
verify_jwt = false

[functions.push-subscription-delete]
verify_jwt = false
```

## Техническая схема

```text
┌─────────────────────────────────────────────────────────────────┐
│                        БРАУЗЕР                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              usePushNotifications                         │   │
│  │  subscribe() ──► selfHostedPost('push-subscription-save') │   │
│  │  unsubscribe() ► selfHostedPost('push-subscription-delete')│  │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  api.academyos.ru (self-hosted)                 │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐   │
│  │ push-subscription-  │  │ push-subscription-delete        │   │
│  │ save                │  │ → DELETE FROM push_subscriptions │   │
│  │ → UPSERT подписки   │  └─────────────────────────────────┘   │
│  └─────────────────────┘                                        │
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐   │
│  │ send-push-          │  │      push_subscriptions         │   │
│  │ notification        │◄─┤ (таблица в self-hosted DB)      │   │
│  │ → SELECT + отправка │  │                                 │   │
│  └─────────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Порядок выполнения

1. Создать `push-subscription-save/index.ts`
2. Создать `push-subscription-delete/index.ts`
3. Обновить `supabase/config.toml`
4. Модифицировать `usePushNotifications.ts`
5. Задеплоить Edge Functions
6. Протестировать push-уведомления

