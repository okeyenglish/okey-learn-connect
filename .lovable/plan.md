

## Цель
Сделать так, чтобы входящие сообщения от клиентов (WhatsApp, Telegram/MAX, OnlinePBX) приводили к push-уведомлениям для admin/manager пользователей организации, а «Тест push» использовал надёжную стратегию «свежая + fallback».

## Диагностика проблемы

### Почему тест в меню работает, а сообщения от клиентов — нет?

1. **Тест push** (`ManagerMenu.tsx`, `PushDiagnostics.tsx`) вызывает:
   ```typescript
   selfHostedPost('send-push-notification', { userId: user.id, payload: {...} })
   ```
   Это прямой вызов self-hosted функции `send-push-notification` — она работает.

2. **Входящие сообщения** обрабатываются webhooks (`telegram-webhook`, `wappi-whatsapp-webhook`, и т.д.), которые:
   - Вызывают `sendPushNotification()` из `_shared/types.ts`
   - `sendPushNotification()` делает HTTP-запрос к `https://api.academyos.ru/functions/v1/send-push-notification`

3. **Критическая проблема**: Edge Functions в этом репозитории (Lovable Cloud) **не синхронизируются автоматически** с self-hosted Supabase (`api.academyos.ru`). 

   Webhook-функции на self-hosted сервере, скорее всего, работают на **устаревшем коде**:
   - Может не быть вызова `sendPushNotification()` вообще
   - Может быть ошибка в `getOrgAdminManagerUserIds()` (неверный join/фильтр)
   - Может отсутствовать логирование, поэтому нет видимости в том, что происходит

## План исправления

### Шаг 1: Добавить диагностическое логирование в webhooks
Улучшить логирование в каждом webhook для чёткого понимания:
- Найдена ли организация?
- Сколько userIds вернул `getOrgAdminManagerUserIds()`?
- Какой результат вернул `sendPushNotification()`?

**Файлы:**
- `supabase/functions/telegram-webhook/index.ts`
- `supabase/functions/wappi-whatsapp-webhook/index.ts`
- `supabase/functions/max-webhook/index.ts`
- `supabase/functions/salebot-webhook/index.ts`
- `supabase/functions/onlinepbx-webhook/index.ts`

### Шаг 2: Исправить `getOrgAdminManagerUserIds()` в `_shared/types.ts`
Текущий запрос:
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('id, user_roles!inner(role)')
  .eq('organization_id', organizationId)
  .in('user_roles.role', ['admin', 'manager']);
```

Проблема: `user_roles` может не иметь правильного foreign key relationship с `profiles` в self-hosted БД, или `!inner` join может работать некорректно.

Решение: использовать более надёжный подход через `user_roles` → `profiles`:
```typescript
// Получаем user_ids с ролями admin/manager
const { data: roleData } = await supabase
  .from('user_roles')
  .select('user_id')
  .in('role', ['admin', 'manager']);

if (!roleData || roleData.length === 0) return [];

const userIds = roleData.map(r => r.user_id);

// Фильтруем по организации
const { data: profiles } = await supabase
  .from('profiles')
  .select('id')
  .eq('organization_id', organizationId)
  .in('id', userIds);

return profiles?.map(p => p.id) || [];
```

### Шаг 3: Реализовать стратегию «Свежая + fallback» для тест-push
В `send-push-notification` изменить логику отправки для тест-пуша:
1. Сначала отправить на самую свежую подписку
2. Если она вернула ошибку (expired/failed) — попробовать следующую
3. Остановиться при первом успехе

```typescript
if (isTestPush) {
  // Сортируем по дате обновления (свежие сначала)
  const sortedSubs = [...subscriptions].sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  
  for (const sub of sortedSubs) {
    const result = await sendWebPush(sub, payload, vapidPublicKey, vapidPrivateKey);
    if (result.success) {
      return { sent: 1, failed: 0 };
    }
    // Удаляем expired подписки
    if (result.error === 'subscription_expired') {
      await supabase.from('push_subscriptions').delete().eq('id', sub.id);
    }
  }
  return { sent: 0, failed: sortedSubs.length };
}
```

### Шаг 4: Инструкция по деплою на self-hosted
Создать документ с чёткими командами для развёртывания обновлённых Edge Functions на self-hosted Supabase.

**Файл:** `docs/migration/11-deploy-edge-functions-to-selfhosted.md`

Содержание:
```bash
# Установить Supabase CLI
npm install -g supabase

# Залогиниться (если ещё не)
supabase login

# Линковка к self-hosted проекту
supabase link --project-ref <your-project-ref>

# Деплой всех webhook-функций
supabase functions deploy telegram-webhook
supabase functions deploy wappi-whatsapp-webhook
supabase functions deploy max-webhook
supabase functions deploy salebot-webhook
supabase functions deploy onlinepbx-webhook
supabase functions deploy send-push-notification
```

### Шаг 5: Добавить UI-индикатор «Push от клиентов»
В `PushDiagnostics.tsx` добавить проверку:
- Есть ли недавние записи `webhook_logs` с `messenger_type = 'push-diagnostic'`?
- Если да — показать статус последней отправки push

Это позволит пользователю видеть, доходят ли push-уведомления от webhooks.

## Изменяемые файлы

| Файл | Изменения |
|------|-----------|
| `supabase/functions/_shared/types.ts` | Исправить `getOrgAdminManagerUserIds()` на более надёжный запрос |
| `supabase/functions/send-push-notification/index.ts` | Добавить стратегию «свежая + fallback» для тест-пуша |
| `supabase/functions/telegram-webhook/index.ts` | Улучшить диагностическое логирование |
| `supabase/functions/wappi-whatsapp-webhook/index.ts` | Улучшить диагностическое логирование |
| `supabase/functions/max-webhook/index.ts` | Улучшить диагностическое логирование |
| `supabase/functions/salebot-webhook/index.ts` | Улучшить диагностическое логирование |
| `supabase/functions/onlinepbx-webhook/index.ts` | Улучшить диагностическое логирование |
| `docs/migration/11-deploy-edge-functions-to-selfhosted.md` | Инструкция по деплою |
| `src/components/notifications/PushDiagnostics.tsx` | Добавить индикатор статуса push от клиентов |

## Важно!
После внесения изменений в Lovable, **необходимо вручную задеплоить** Edge Functions на self-hosted Supabase (`api.academyos.ru`). Без этого шага push-уведомления от входящих сообщений работать не будут.

