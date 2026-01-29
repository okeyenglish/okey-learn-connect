
# План: Интеграция нативных Push-уведомлений через Capacitor

## Обзор

Добавление нативных push-уведомлений для iOS (APNs) и Android (FCM) в дополнение к существующим Web Push уведомлениям. Система будет автоматически определять платформу и использовать соответствующий механизм доставки.

---

## Архитектура решения

```text
┌─────────────────────────────────────────────────────────────┐
│                    Фронтенд (React)                         │
├─────────────────────────────────────────────────────────────┤
│  useNativePushNotifications.ts                              │
│    ├── Определение платформы (iOS/Android/Web)              │
│    ├── Для Native: @capacitor/push-notifications            │
│    └── Для Web: существующий usePushNotifications           │
├─────────────────────────────────────────────────────────────┤
│  usePushNotifications.ts (обновлённый)                      │
│    └── Унифицированный интерфейс для всех платформ          │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Бэкенд (Edge Functions)                   │
├─────────────────────────────────────────────────────────────┤
│  native-push-register                                        │
│    └── Сохранение FCM/APNs токена в push_subscriptions       │
├─────────────────────────────────────────────────────────────┤
│  send-push-notification (обновлённый)                        │
│    ├── Web Push → VAPID/Web Push Protocol                    │
│    └── Native → Firebase Admin SDK                           │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│               Firebase Cloud Messaging (FCM)                 │
│  ├── Android → напрямую                                      │
│  └── iOS → через APNs (автоматически)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Что будет сделано

### 1. Установка зависимостей

**Новый пакет:**
```json
"@capacitor/push-notifications": "^7.0.0"
```

### 2. Создание утилиты определения платформы

**Новый файл: `src/lib/capacitorPlatform.ts`**

```typescript
import { Capacitor } from '@capacitor/core';

export type Platform = 'ios' | 'android' | 'web';

export function getPlatform(): Platform {
  if (!Capacitor.isNativePlatform()) {
    return 'web';
  }
  return Capacitor.getPlatform() as 'ios' | 'android';
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function isIOS(): boolean {
  return getPlatform() === 'ios';
}

export function isAndroid(): boolean {
  return getPlatform() === 'android';
}
```

### 3. Создание хука для нативных push-уведомлений

**Новый файл: `src/hooks/useNativePushNotifications.ts`**

Основные функции:
- Регистрация устройства в FCM/APNs
- Получение device token
- Обработка входящих уведомлений
- Обработка нажатий на уведомления (deep linking)

```typescript
// Пример структуры
export function useNativePushNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  
  // Listeners для push событий
  useEffect(() => {
    // registration - получение токена
    // pushNotificationReceived - уведомление получено
    // pushNotificationActionPerformed - клик по уведомлению
  }, []);
  
  const register = async () => {
    // Проверка разрешений
    // Регистрация в FCM/APNs
    // Отправка токена на сервер
  };
  
  return { token, isRegistered, register, unregister };
}
```

### 4. Обновление основного хука usePushNotifications

**Изменения в `src/hooks/usePushNotifications.ts`:**

- Добавление определения платформы
- Условное использование Web Push или Native Push
- Унификация интерфейса для компонентов UI

```typescript
export function usePushNotifications() {
  const platform = getPlatform();
  
  // На нативной платформе используем Capacitor
  if (platform !== 'web') {
    return useNativePushNotifications();
  }
  
  // На вебе - существующая Web Push логика
  return useWebPushNotifications();
}
```

### 5. Edge Function для регистрации нативных токенов

**Новый файл: `supabase/functions/native-push-register/index.ts`**

Функции:
- Сохранение FCM/APNs токена в таблицу `push_subscriptions`
- Тип подписки: `fcm` или `apns`
- Связь с `user_id`

### 6. Обновление Edge Function отправки уведомлений

**Изменения в существующей функции `send-push-notification`:**

```typescript
// Определение типа подписки
if (subscription.type === 'fcm' || subscription.type === 'apns') {
  // Отправка через Firebase Admin SDK
  await sendViaFCM(subscription.token, payload);
} else {
  // Отправка через Web Push Protocol
  await sendViaWebPush(subscription.endpoint, keys, payload);
}
```

### 7. Обновление схемы базы данных

**Миграция для `push_subscriptions`:**

```sql
-- Добавление колонки для типа подписки
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS subscription_type TEXT 
DEFAULT 'web' 
CHECK (subscription_type IN ('web', 'fcm', 'apns'));

-- Добавление колонки для device token (FCM/APNs)
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS device_token TEXT;

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_type 
ON push_subscriptions(subscription_type);
```

### 8. Обработка Deep Linking

При клике на уведомление:
- Парсинг `url` из data payload
- Навигация к соответствующему экрану
- Интеграция с react-router-dom

---

## Изменяемые файлы

| Файл | Действие | Описание |
|------|----------|----------|
| `package.json` | Изменение | Добавление `@capacitor/push-notifications` |
| `src/lib/capacitorPlatform.ts` | Создание | Утилиты определения платформы |
| `src/hooks/useNativePushNotifications.ts` | Создание | Хук для нативных push |
| `src/hooks/usePushNotifications.ts` | Изменение | Унификация Web/Native |
| `supabase/functions/native-push-register/index.ts` | Создание | Регистрация токенов |
| `supabase/functions/send-push-notification/index.ts` | Изменение | Поддержка FCM |

---

## Требования для публикации

### Firebase (обязательно для обеих платформ)

1. Создать проект в Firebase Console
2. Добавить приложения iOS и Android
3. Скачать конфигурационные файлы:
   - **Android:** `google-services.json` → `android/app/`
   - **iOS:** `GoogleService-Info.plist` → `ios/App/App/`
4. Получить Firebase Server Key для бэкенда

### iOS (дополнительно)

1. Apple Developer Account ($99/год)
2. Создать APNs Key в Apple Developer Portal
3. Загрузить `.p8` ключ в Firebase

### Android

Никаких дополнительных действий — FCM работает "из коробки" после добавления `google-services.json`

---

## Секреты для Edge Functions

Необходимо добавить секрет `FIREBASE_SERVICE_ACCOUNT` с JSON-ключом сервисного аккаунта Firebase:

```json
{
  "type": "service_account",
  "project_id": "your-project",
  "private_key": "...",
  "client_email": "..."
}
```

---

## Последовательность внедрения

1. ✅ Установить `@capacitor/push-notifications`
2. ✅ Создать `capacitorPlatform.ts`
3. ✅ Создать `useNativePushNotifications.ts`
4. ✅ Обновить `usePushNotifications.ts`
5. ✅ Создать Edge Function `native-push-register`
6. ✅ Обновить Edge Function `send-push-notification`
7. 📋 Создать Firebase проект (выполняется пользователем)
8. 📋 Добавить конфигурационные файлы (локально после экспорта)
9. 📋 Добавить секрет Firebase в Lovable Cloud

---

## Совместимость

- ✅ Существующие Web Push уведомления продолжат работать
- ✅ PWA функциональность не затрагивается
- ✅ Единый UI для управления уведомлениями на всех платформах
- ✅ Существующие подписки не будут затронуты
