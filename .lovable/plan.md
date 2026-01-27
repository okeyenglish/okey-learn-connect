
# План: Жёсткая привязка Push-уведомлений к Self-Hosted Supabase

## Текущая архитектура

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  usePushNotifications.ts (CRM)       usePortalPushNotifications.ts (Portal) │
│  ├── VAPID: BNCGXWZNici... ✅        ├── VAPID: BMq-TnK0qX... ❌            │
│  ├── subscribe → selfHostedPost       ├── subscribe → selfHostedPost         │
│  └── Вызов: portal-push-config       └── Вызов: portal-push-config          │
│                                                                             │
│  PushDiagnostics.tsx                                                        │
│  └── Вызов: portal-push-config, send-push-notification                     │
│                                                                             │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
                          │ selfHostedApi (api.academyos.ru)
                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SELF-HOSTED SUPABASE (api.academyos.ru)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Edge Functions:                                                            │
│  ├── portal-push-config      → Deno.env.get('VAPID_PUBLIC_KEY')            │
│  ├── push-subscription-save  → push_subscriptions table                    │
│  ├── push-subscription-delete → push_subscriptions table                   │
│  └── send-push-notification  → VAPID signing + WebPush                     │
│                                                                             │
│  Secrets (должны быть настроены на self-hosted):                           │
│  ├── VAPID_PUBLIC_KEY  = BNCGXWZNici...                                    │
│  ├── VAPID_PRIVATE_KEY = Ag3ubLQIi1H...                                    │
│  ├── SUPABASE_URL                                                          │
│  └── SUPABASE_SERVICE_ROLE_KEY                                             │
│                                                                             │
│  Database:                                                                  │
│  └── push_subscriptions (endpoint, keys, user_id, updated_at)              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Обнаруженные проблемы

### 1. Несоответствие VAPID ключа в Portal хуке
- **Файл**: `src/hooks/usePortalPushNotifications.ts`
- **Проблема**: Строка 6 содержит неправильный fallback ключ `BMq-TnK0qX...`
- **Правильный ключ**: `BNCGXWZNiciyztYDIZPXM_smN8mBxrfFPIG_ohpea-9H5B0Gl-zjfWkh7XJOemAh2iDQR87V3f54LQ12DRJfl6s`

### 2. Отсутствие логирования при получении VAPID ключа
- Функция `fetchVapidPublicKey` не сообщает, получила ли она ключ с сервера или использует fallback
- Это критично для диагностики проблем

### 3. Secrets на self-hosted сервере
- Необходимо убедиться, что на `api.academyos.ru` установлены правильные VAPID ключи
- Lovable Cloud secrets НЕ используются — всё работает через self-hosted

### 4. Диагностика не показывает соответствие ключей
- `PushDiagnostics.tsx` не сравнивает VAPID ключ подписки с ключом сервера

## Детальный план изменений

### Шаг 1: Синхронизация VAPID ключей в коде

**Файл: `src/hooks/usePortalPushNotifications.ts`**

Изменить строку 6:
```typescript
// БЫЛО:
const VAPID_PUBLIC_KEY = 'BMq-TnK0qXtJGnxvEALqjPGqEFGvD7kQLLvDMvpL2vgL6qvXGHqpDqWqYqKqMqNqLqOq';

// СТАНЕТ:
const VAPID_PUBLIC_KEY = 'BNCGXWZNiciyztYDIZPXM_smN8mBxrfFPIG_ohpea-9H5B0Gl-zjfWkh7XJOemAh2iDQR87V3f54LQ12DRJfl6s';
```

### Шаг 2: Улучшить логирование в usePushNotifications

**Файл: `src/hooks/usePushNotifications.ts`**

Обновить функцию `fetchVapidPublicKey()` (строки 56-72):
```typescript
async function fetchVapidPublicKey(): Promise<string> {
  try {
    const res = await selfHostedPost<{ success?: boolean; vapidPublicKey?: string; error?: string }>(
      'portal-push-config',
      undefined
    );

    const key = res.data?.vapidPublicKey;
    if (res.success && typeof key === 'string' && key.length > 20) {
      console.log('[Push] VAPID key from self-hosted server:', key.substring(0, 20) + '...');
      return key;
    }
    console.warn('[Push] Self-hosted returned invalid VAPID, using fallback:', VAPID_PUBLIC_KEY.substring(0, 20) + '...');
  } catch (e) {
    console.warn('[Push] Failed to fetch VAPID from self-hosted, using fallback:', e);
  }
  return VAPID_PUBLIC_KEY;
}
```

### Шаг 3: Расширить диагностику для проверки VAPID ключей

**Файл: `src/components/notifications/PushDiagnostics.tsx`**

Добавить новый диагностический пункт `vapidMatch` для сравнения ключей:

1. Добавить в `DiagnosticState`:
```typescript
vapidMatch: DiagnosticResult;
```

2. Добавить в `initialState`:
```typescript
vapidMatch: { status: 'pending', message: 'VAPID ключи' },
```

3. После проверки сервера добавить проверку соответствия VAPID:
```typescript
// 6. Check VAPID key match
updateDiagnostic('vapidMatch', { status: 'checking' });

try {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (!subscription) {
    updateDiagnostic('vapidMatch', {
      status: 'warning',
      message: 'Нет подписки для проверки',
    });
  } else {
    // Get server VAPID key
    const serverResponse = await selfHostedPost<{ vapidPublicKey?: string }>('portal-push-config');
    const serverVapidKey = serverResponse.data?.vapidPublicKey;
    
    if (!serverVapidKey) {
      updateDiagnostic('vapidMatch', {
        status: 'warning',
        message: 'Сервер не вернул VAPID ключ',
      });
    } else {
      // Compare subscription's applicationServerKey with server key
      const subKey = subscription.options?.applicationServerKey;
      if (subKey) {
        const subKeyArray = new Uint8Array(subKey as ArrayBuffer);
        const subKeyB64 = btoa(String.fromCharCode(...subKeyArray))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        
        const keyMatch = subKeyB64 === serverVapidKey;
        
        updateDiagnostic('vapidMatch', {
          status: keyMatch ? 'success' : 'error',
          message: keyMatch ? 'Ключи совпадают' : 'Ключи НЕ совпадают!',
          details: keyMatch 
            ? `Сервер: ${serverVapidKey.substring(0, 15)}...`
            : `Сервер: ${serverVapidKey.substring(0, 15)}... ≠ Подписка: ${subKeyB64.substring(0, 15)}...`,
        });
      } else {
        updateDiagnostic('vapidMatch', {
          status: 'warning',
          message: 'Ключ подписки недоступен',
        });
      }
    }
  }
} catch (err) {
  updateDiagnostic('vapidMatch', {
    status: 'error',
    message: 'Ошибка проверки VAPID',
    details: err instanceof Error ? err.message : 'Unknown',
  });
}
```

### Шаг 4: Добавить иконку для vapidMatch

Добавить в функцию `getDiagnosticIcon`:
```typescript
case 'vapidMatch':
  return <Key className="h-4 w-4" />;
```

И импортировать `Key` из lucide-react.

## Действия на Self-Hosted сервере (для пользователя)

После изменений в коде, необходимо на `api.academyos.ru` выполнить:

```bash
# 1. Проверить текущие ключи
supabase secrets list | grep VAPID

# 2. Если ключи отличаются от предоставленных, обновить:
supabase secrets set VAPID_PUBLIC_KEY="BNCGXWZNiciyztYDIZPXM_smN8mBxrfFPIG_ohpea-9H5B0Gl-zjfWkh7XJOemAh2iDQR87V3f54LQ12DRJfl6s"
supabase secrets set VAPID_PRIVATE_KEY="Ag3ubLQIi1HUDfzr9F3zdttibP6svYoMp1VQjBdRZ04"

# 3. Перезапустить Edge Functions
supabase functions deploy portal-push-config
supabase functions deploy send-push-notification
supabase functions deploy push-subscription-save
supabase functions deploy push-subscription-delete
```

## Ожидаемые изменения в файлах

| Файл | Тип изменения |
|------|---------------|
| `src/hooks/usePortalPushNotifications.ts` | Исправление VAPID ключа (строка 6) |
| `src/hooks/usePushNotifications.ts` | Улучшение логирования fetchVapidPublicKey |
| `src/components/notifications/PushDiagnostics.tsx` | Добавление проверки VAPID соответствия |

## Результат

После изменений:
1. Оба хука (CRM и Portal) будут использовать одинаковый VAPID ключ
2. Логирование покажет источник VAPID ключа (сервер или fallback)
3. Диагностика покажет статус соответствия ключей
4. Push-уведомления будут работать стабильно через self-hosted

## Важно: Переподписка пользователей

После синхронизации ключей существующие подписки с неправильными ключами станут невалидными. Система автоматически:
1. Обнаружит несоответствие при health check (каждые 24 часа)
2. Выполнит переподписку с правильным ключом
3. Обновит данные на сервере

Для немедленной переподписки пользователи могут использовать кнопку "Переподписаться" в диагностике.
