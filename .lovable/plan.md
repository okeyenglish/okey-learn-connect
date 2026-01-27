

# План: Lovable Cloud как Fallback для Push-уведомлений

## Текущая архитектура

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
│                                                                              │
│  usePushNotifications.ts                                                     │
│  ├── selfHostedPost('portal-push-config')  → VAPID ключ                     │
│  ├── selfHostedPost('push-subscription-save')  → сохранение подписки        │
│  └── selfHostedPost('push-subscription-delete') → удаление подписки         │
│                                                                              │
│  Текущий flow: ТОЛЬКО self-hosted (api.academyos.ru)                        │
│  Если self-hosted недоступен → ошибка                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SELF-HOSTED (api.academyos.ru)                          │
│                                                                             │
│  Edge Functions:                                                            │
│  ├── portal-push-config                                                     │
│  ├── push-subscription-save                                                 │
│  ├── push-subscription-delete                                               │
│  └── send-push-notification                                                 │
│                                                                             │
│  Database: push_subscriptions                                               │
│  Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Новая архитектура с Fallback

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
│                                                                              │
│  usePushNotifications.ts                                                     │
│  ├── TRY: selfHostedPost('portal-push-config')                              │
│  │   └── FALLBACK: supabase.functions.invoke('portal-push-config')          │
│  ├── TRY: selfHostedPost('push-subscription-save')                          │
│  │   └── FALLBACK: supabase.functions.invoke('push-subscription-save')      │
│  └── ...                                                                     │
│                                                                              │
│  selfHostedApi.ts: Добавить pushApiWithFallback helper                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌─────────────────────────────┐     ┌─────────────────────────────┐
│   SELF-HOSTED (PRIMARY)     │     │   LOVABLE CLOUD (FALLBACK)  │
│   api.academyos.ru          │     │   igqdjqmohwsgyeuhitqg      │
│                             │     │                             │
│   ✅ Основной бэкенд        │     │   📦 Резервный бэкенд       │
│   ✅ База данных            │     │   📦 Те же Edge Functions   │
│   ✅ VAPID ключи            │     │   📦 Свои VAPID ключи       │
└─────────────────────────────┘     └─────────────────────────────┘
```

## Важное ограничение

VAPID ключи на self-hosted и Lovable Cloud **разные**:
- Self-hosted: `BNCGXWZNici...`
- Lovable Cloud: `BCqgfbaK1qd...` (или другой)

**Это означает**: подписка, созданная с ключом self-hosted, не будет работать через Lovable Cloud и наоборот.

### Варианты решения:

1. **Синхронизировать VAPID ключи** — установить одинаковые ключи на обоих серверах
2. **Dual-subscription** — создавать подписку для обоих серверов (сложно, не рекомендуется)
3. **Fallback только для конфигурации** — использовать Cloud только для получения VAPID ключа, остальное через self-hosted

---

## План реализации

### Шаг 1: Синхронизировать VAPID ключи

Для полноценного fallback необходимо, чтобы VAPID ключи совпадали.

**Обновить в Lovable Cloud Secrets:**
```
VAPID_PUBLIC_KEY = BNCGXWZNiciyztYDIZPXM_smN8mBxrfFPIG_ohpea-9H5B0Gl-zjfWkh7XJOemAh2iDQR87V3f54LQ12DRJfl6s
VAPID_PRIVATE_KEY = Ag3ubLQIi1HUDfzr9F3zdttibP6svYoMp1VQjBdRZ04
```

### Шаг 2: Создать helper для API с fallback

**Новый файл: `src/lib/pushApiWithFallback.ts`**

```typescript
import { selfHostedPost } from './selfHostedApi';
import { supabase } from '@/integrations/supabase/client';

interface FallbackOptions {
  maxRetries?: number;
  fallbackEnabled?: boolean;
}

export async function pushApiWithFallback<T>(
  endpoint: string,
  body?: unknown,
  options: FallbackOptions = {}
): Promise<{ success: boolean; data?: T; error?: string; source: 'self-hosted' | 'lovable-cloud' }> {
  const { maxRetries = 2, fallbackEnabled = true } = options;
  
  // Try self-hosted first
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await selfHostedPost<T>(endpoint, body, {
        retry: { noRetry: true } // Disable internal retry for faster fallback
      });
      
      if (res.success) {
        return { success: true, data: res.data, source: 'self-hosted' };
      }
      
      // Non-retryable error
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
        return { success: false, error: res.error, source: 'self-hosted' };
      }
    } catch (e) {
      console.warn(`[Push] Self-hosted attempt ${attempt + 1} failed:`, e);
    }
  }
  
  // Fallback to Lovable Cloud
  if (fallbackEnabled) {
    console.log('[Push] Falling back to Lovable Cloud for:', endpoint);
    
    try {
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: body as Record<string, unknown>
      });
      
      if (error) {
        return { success: false, error: error.message, source: 'lovable-cloud' };
      }
      
      return { success: true, data: data as T, source: 'lovable-cloud' };
    } catch (e) {
      console.error('[Push] Lovable Cloud fallback failed:', e);
      return { 
        success: false, 
        error: e instanceof Error ? e.message : 'Fallback failed',
        source: 'lovable-cloud' 
      };
    }
  }
  
  return { success: false, error: 'All attempts failed', source: 'self-hosted' };
}
```

### Шаг 3: Обновить usePushNotifications.ts

Заменить прямые вызовы `selfHostedPost` на `pushApiWithFallback`:

```typescript
// Было:
const saveResponse = await selfHostedPost<{ success: boolean }>('push-subscription-save', {...});

// Станет:
const saveResponse = await pushApiWithFallback<{ success: boolean }>('push-subscription-save', {...});

// Логирование источника:
if (saveResponse.success) {
  console.log(`[Push] Subscription saved via ${saveResponse.source}`);
}
```

### Шаг 4: Обновить fetchVapidPublicKey с fallback

```typescript
async function fetchVapidPublicKey(): Promise<string> {
  // Try self-hosted first
  try {
    const res = await selfHostedPost<{ vapidPublicKey?: string }>('portal-push-config', undefined, {
      retry: { noRetry: true }
    });
    
    if (res.success && res.data?.vapidPublicKey) {
      console.log('[Push] VAPID from self-hosted');
      return res.data.vapidPublicKey;
    }
  } catch (e) {
    console.warn('[Push] Self-hosted VAPID fetch failed:', e);
  }
  
  // Fallback to Lovable Cloud
  try {
    const { data, error } = await supabase.functions.invoke('portal-push-config');
    if (!error && data?.vapidPublicKey) {
      console.log('[Push] VAPID from Lovable Cloud (fallback)');
      return data.vapidPublicKey;
    }
  } catch (e) {
    console.warn('[Push] Lovable Cloud VAPID fetch failed:', e);
  }
  
  // Ultimate fallback to hardcoded
  console.warn('[Push] Using hardcoded VAPID fallback');
  return VAPID_PUBLIC_KEY;
}
```

### Шаг 5: Добавить индикатор источника в диагностику

**Файл: `src/components/notifications/PushDiagnostics.tsx`**

Добавить отображение какой сервер используется:
- 🟢 Self-hosted (основной)
- 🟡 Lovable Cloud (fallback)

---

## Изменяемые файлы

| Файл | Изменения |
|------|-----------|
| `src/lib/pushApiWithFallback.ts` | Новый файл — helper с fallback логикой |
| `src/hooks/usePushNotifications.ts` | Использовать fallback для всех push операций |
| `src/hooks/usePortalPushNotifications.ts` | Использовать fallback для portal операций |
| `src/components/notifications/PushDiagnostics.tsx` | Показывать источник (self-hosted/cloud) |

---

## Предварительные действия (для пользователя)

Чтобы fallback работал корректно, необходимо синхронизировать VAPID ключи:

Обновить в Lovable Cloud secrets (через UI настроек):

```
VAPID_PUBLIC_KEY = BNCGXWZNiciyztYDIZPXM_smN8mBxrfFPIG_ohpea-9H5B0Gl-zjfWkh7XJOemAh2iDQR87V3f54LQ12DRJfl6s
VAPID_PRIVATE_KEY = Ag3ubLQIi1HUDfzr9F3zdttibP6svYoMp1VQjBdRZ04
```

---

## Ожидаемый результат

1. **Основной режим**: Push работает через self-hosted (api.academyos.ru)
2. **При недоступности self-hosted**: автоматический переход на Lovable Cloud
3. **Логирование**: в консоли видно какой сервер обработал запрос
4. **Диагностика**: показывает текущий источник
5. **Единые VAPID ключи**: подписки работают через оба сервера

