
# План: Web-панель клиента для WPP Messaging Platform

## ✅ Статус: Реализовано

## Обзор

Создание нового интерфейса подключения WhatsApp с автоматической интеграцией через backend. Пользователь не вводит API ключи - всё создаётся автоматически при нажатии кнопки.

## Архитектура

```text
+------------------+     +-------------------+     +------------------+
|   Frontend UI    |---->|  Edge Functions   |---->|  WPP Platform    |
|  (React + Poll)  |<----|  (Self-hosted)    |<----|  msg.academyos.ru|
+------------------+     +-------------------+     +------------------+
        |                        |
        |   JWT Auth             |   Master API Key
        v                        v
   [Polling каждые 2с]    [messenger_integrations]
```

## Реализованные изменения

### 1. Edge Functions (для self-hosted сервера)

| Файл | Статус | Описание |
|------|--------|----------|
| `supabase/functions/wpp-create/index.ts` | ✅ Создан | Автоматическое создание интеграции |
| `supabase/functions/wpp-qr/index.ts` | ✅ Создан | Получение QR-кода |
| `supabase/functions/wpp-status/index.ts` | ✅ Существует | Проверка статуса |

### 2. Frontend

| Файл | Статус | Описание |
|------|--------|----------|
| `src/lib/wppApi.ts` | ✅ Обновлён | Новые методы wppCreate, wppQr, wppGetStatus |
| `src/components/admin/integrations/WppConnectPanel.tsx` | ✅ Создан | Новый компонент с polling |
| `src/components/admin/integrations/WhatsAppIntegrations.tsx` | ✅ Обновлён | Использует WppConnectPanel |

## ⚠️ Требуется ручной деплой

Edge Functions необходимо вручную задеплоить на self-hosted сервер (api.academyos.ru):

```bash
# Скопировать файлы на сервер:
# - supabase/functions/wpp-create/index.ts
# - supabase/functions/wpp-qr/index.ts

# Или задеплоить через Supabase CLI
supabase functions deploy wpp-create --project-ref your-ref
supabase functions deploy wpp-qr --project-ref your-ref
```

↓ После клика (loading)

+----------------------------------------+
|  WhatsApp Integration                   |
|----------------------------------------|
| [Ожидание QR-кода...]                  |
|  ⏳ Загрузка...                        |
+----------------------------------------+

↓ QR получен

+----------------------------------------+
|  WhatsApp Integration                   |
|----------------------------------------|
| Отсканируйте QR-код                    |
|                                        |
|     ┌─────────────┐                    |
|     │   QR CODE   │                    |
|     │             │                    |
|     └─────────────┘                    |
|                                        |
| Session: client_abc123                 |
| [Обновить QR]                          |
+----------------------------------------+

↓ После сканирования

+----------------------------------------+
|  WhatsApp Integration                   |
|----------------------------------------|
| ✅ WhatsApp подключён                  |
|                                        |
| Session:  client_abc123                |
| API Key:  key_xxx••••••                |
| Статус:   🟢 Подключено                |
|                                        |
| [Отключить]                            |
+----------------------------------------+
```

### 3. Логика polling

```text
1. Клик "Подключить WhatsApp"
   └─> POST /wpp-create
       └─> Получаем { session, apiKey, status }

2. Если status != "connected"
   └─> Запускаем polling каждые 2 секунды:
       ├─> GET /wpp-qr?session=xxx
       │   └─> Если qr !== null → показываем QR
       └─> GET /wpp-status?session=xxx
           └─> Если status === "connected" → останавливаем polling

3. После connected:
   └─> Показываем панель с данными
   └─> Обновляем список интеграций
```

### 4. Файлы для изменения

| Файл | Действие |
|------|----------|
| `supabase/functions/wpp-create/index.ts` | Создать |
| `supabase/functions/wpp-qr/index.ts` | Создать |
| `supabase/functions/wpp-status/index.ts` | Обновить |
| `src/lib/wppApi.ts` | Обновить под новый API |
| `src/components/admin/integrations/WppConnectPanel.tsx` | Создать (замена WppQuickConnect) |
| `src/components/admin/integrations/WhatsAppIntegrations.tsx` | Обновить |

## Технические детали

### wpp-create Edge Function

```typescript
// Псевдокод
POST /wpp-create
Authorization: Bearer {JWT}

1. Проверяем JWT → user_id
2. Получаем organization_id из profiles
3. Генерируем clientId = org_id.substring(0,8)
4. Проверяем messenger_integrations:
   - Если есть с wppApiKey → возвращаем существующий
   - Если нет → WppMsgClient.createApiKey(masterKey, clientId)
5. Сохраняем в messenger_integrations
6. Возвращаем { success, session, apiKey, status: "starting" }
```

### wpp-qr Edge Function

```typescript
// Псевдокод  
GET /wpp-qr?session={session}
Authorization: Bearer {JWT}

1. Проверяем JWT
2. Находим интеграцию по session в settings.wppAccountNumber
3. Создаём WppMsgClient с orgApiKey
4. Вызываем wpp.getAccountQr(session)
5. Возвращаем { success, qr }
```

### Frontend polling

```typescript
// Псевдокод React hook
const useWppConnection = () => {
  const [status, setStatus] = useState('idle');
  const [qr, setQr] = useState(null);
  const [session, setSession] = useState(null);
  
  const connect = async () => {
    setStatus('loading');
    const result = await selfHostedPost('wpp-create');
    setSession(result.data.session);
    
    if (result.data.status === 'connected') {
      setStatus('connected');
      return;
    }
    
    // Start polling
    const pollInterval = setInterval(async () => {
      const [qrRes, statusRes] = await Promise.all([
        selfHostedGet(`wpp-qr?session=${result.data.session}`),
        selfHostedGet(`wpp-status?session=${result.data.session}`)
      ]);
      
      if (qrRes.data?.qr) setQr(qrRes.data.qr);
      if (statusRes.data?.status === 'connected') {
        setStatus('connected');
        clearInterval(pollInterval);
      }
    }, 2000);
  };
  
  return { status, qr, session, connect };
};
```

## Последовательность реализации

1. Создать Edge Functions (wpp-create, wpp-qr, обновить wpp-status)
2. Обновить src/lib/wppApi.ts с новыми методами
3. Создать новый компонент WppConnectPanel
4. Интегрировать в WhatsAppIntegrations
5. Удалить старый WppQuickConnect

## Требования к деплою

После реализации необходимо вручную задеплоить Edge Functions на self-hosted сервер (api.academyos.ru), так как они не синхронизируются автоматически с Lovable Cloud.
