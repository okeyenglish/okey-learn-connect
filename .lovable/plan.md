
# План: Lovable Cloud как основной источник для Push-уведомлений

## Текущая ситуация

Сейчас архитектура push-уведомлений работает так:

1. **Основной**: self-hosted (api.academyos.ru)
2. **Fallback**: Lovable Cloud (igqdjqmohwsgyeuhitqg.supabase.co)

Self-hosted не работает стабильно, поэтому нужно инвертировать приоритет.

## Что уже готово в Lovable Cloud

Все необходимые Edge Functions уже созданы и работают:
- `portal-push-config` - возвращает VAPID ключ
- `push-subscription-save` - сохраняет подписки
- `push-subscription-delete` - удаляет подписки  
- `send-push-notification` - отправляет push с полным RFC 8291 шифрованием
- `portal-push-send` - отправка для родительского портала
- `portal-push-subscribe` / `portal-push-unsubscribe` - для клиентов портала

Таблица `push_subscriptions` также создана в Lovable Cloud.

## План изменений

### Файл: `src/lib/pushApiWithFallback.ts`

Инвертировать логику - сначала Lovable Cloud, потом self-hosted:

```typescript
// БЫЛО: self-hosted → Lovable Cloud
// СТАНЕТ: Lovable Cloud → self-hosted

export async function pushApiWithFallback<T = unknown>(
  endpoint: string,
  body?: unknown,
  options: FallbackOptions = {}
): Promise<PushApiResponse<T>> {
  
  // 1. Сначала пробуем Lovable Cloud (основной)
  const cloudResponse = await callLovableCloud<T>(endpoint, body, options);
  if (cloudResponse.success) {
    return { ...cloudResponse, source: 'lovable-cloud' };
  }
  
  // 2. Fallback на self-hosted при ошибке Cloud
  if (options.fallbackEnabled !== false) {
    const selfHostedResponse = await callSelfHosted<T>(endpoint, body, options);
    return { ...selfHostedResponse, source: 'self-hosted' };
  }
  
  return cloudResponse;
}
```

### Изменения в деталях

1. **Удалить цикл retry для self-hosted в начале** - он больше не нужен как primary
2. **Переместить логику Lovable Cloud в начало** - она становится primary
3. **Добавить self-hosted как fallback** - при ошибках Cloud
4. **Обновить логирование** - отражать новый порядок

### Файл: `src/hooks/usePushNotifications.ts`

Обновить комментарии и fallback VAPID ключ (без изменений в логике - она уже использует `pushApiWithFallback`).

### Файл: `src/hooks/usePortalPushNotifications.ts`

Аналогично - логика уже использует `pushApiWithFallback`, обновить только комментарии.

## Технические детали

```text
┌───────────────────────────────────────────────────────────────┐
│                    НОВАЯ АРХИТЕКТУРА                          │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│    Frontend (CRM / Parent Portal)                             │
│         │                                                     │
│         ▼                                                     │
│  pushApiWithFallback()                                        │
│         │                                                     │
│         ├──────────────────┐                                  │
│         │                  │                                  │
│         ▼ PRIMARY          ▼ FALLBACK                         │
│  ┌──────────────┐   ┌─────────────────┐                       │
│  │Lovable Cloud │   │  Self-Hosted    │                       │
│  │(supabase.co) │   │(api.academyos.ru)│                       │
│  └──────────────┘   └─────────────────┘                       │
│         │                  │                                  │
│         ▼                  ▼                                  │
│  push_subscriptions   push_subscriptions                      │
│  (Lovable Cloud DB)   (Self-Hosted DB)                        │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Важно: Синхронизация подписок

После переключения:
- Новые подписки будут сохраняться в Lovable Cloud
- Старые подписки на self-hosted останутся там
- При отправке push, если подписка не найдена в Cloud - fallback найдет её в self-hosted

## Ожидаемый результат

1. Push-уведомления будут отправляться через стабильный Lovable Cloud
2. Self-hosted останется как резервный вариант
3. Существующие подписки на self-hosted продолжат работать через fallback
4. Новые подписки будут сохраняться в Lovable Cloud
