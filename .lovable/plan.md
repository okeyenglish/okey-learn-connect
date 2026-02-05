

## Проблема: WPP подключение не сохраняется после перезагрузки

### Текущая ситуация

`WppConnectPanel` хранит данные о подключении (`session`, `apiKey`) только в локальном состоянии React:
```typescript
const [connectionData, setConnectionData] = useState<ConnectionData | null>(null);
```

При перезагрузке страницы это состояние теряется, хотя данные интеграции **уже сохранены** в таблице `messenger_integrations` через `wpp-create`.

### Решение

Переделать `WppConnectPanel` для работы с БД через существующий хук `useMessengerIntegrations`:

1. При загрузке компонента читать существующие WPP интеграции из БД
2. Показывать статус каждой сессии (connected/disconnected)
3. Позволять добавлять новые сессии

---

## Архитектура компонента

```text
WppConnectPanel
├── Загрузка: useMessengerIntegrations('whatsapp')
│   └── Фильтр: provider === 'wpp'
├── Отображение списка WPP интеграций
│   ├── Для каждой: проверка статуса через wppGetStatus()
│   └── UI: Session, API Key, кнопка Отключить
└── Кнопка "Подключить новый WhatsApp"
    └── wppCreate(force_recreate: true) для новой сессии
```

---

## Технические изменения

### Файл: `src/components/admin/integrations/WppConnectPanel.tsx`

#### 1. Импорты и типы

```typescript
import { useMessengerIntegrations, MessengerIntegration } from '@/hooks/useMessengerIntegrations';
import { useQuery } from '@tanstack/react-query';

interface WppSessionInfo {
  integration: MessengerIntegration;
  status: 'connected' | 'disconnected' | 'checking';
  session: string;
  apiKey: string;
}
```

#### 2. Загрузка существующих интеграций

```typescript
const { integrations, isLoading: integrationsLoading, refetch } = useMessengerIntegrations('whatsapp');

// Фильтруем только WPP провайдер
const wppIntegrations = integrations.filter(i => i.provider === 'wpp');
```

#### 3. Проверка статуса при загрузке

```typescript
// Для каждой интеграции проверяем статус
const [sessionsStatus, setSessionsStatus] = useState<Map<string, WppSessionInfo>>(new Map());

useEffect(() => {
  const checkStatuses = async () => {
    for (const integration of wppIntegrations) {
      const settings = integration.settings as Record<string, any>;
      const session = settings.wppAccountNumber;
      const apiKey = settings.wppApiKey;
      
      if (!session) continue;
      
      // Проверяем статус через API
      const statusResult = await wppGetStatus(session, false);
      
      setSessionsStatus(prev => new Map(prev).set(integration.id, {
        integration,
        status: statusResult.status === 'connected' ? 'connected' : 'disconnected',
        session,
        apiKey: maskApiKey(apiKey),
      }));
    }
  };
  
  if (wppIntegrations.length > 0) {
    checkStatuses();
  }
}, [wppIntegrations]);
```

#### 4. UI компонента

```typescript
// Показываем список существующих сессий
return (
  <div className="space-y-4">
    {/* Существующие сессии */}
    {Array.from(sessionsStatus.values()).map((info) => (
      <Card key={info.integration.id}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <div>
              <h3 className="font-medium">WhatsApp подключён</h3>
              <Badge>{info.status === 'connected' ? '🟢 Подключено' : '🔴 Отключено'}</Badge>
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="flex justify-between p-2 bg-muted rounded">
              <span>Session:</span>
              <code>{info.session}</code>
            </div>
            <div className="flex justify-between p-2 bg-muted rounded">
              <span>API Key:</span>
              <code>{info.apiKey}</code>
            </div>
          </div>
          
          <Button variant="outline" onClick={() => handleDisconnect(info.session)}>
            <Power className="h-4 w-4 mr-2" />
            Отключить
          </Button>
        </CardContent>
      </Card>
    ))}
    
    {/* Кнопка добавления новой сессии */}
    <Button onClick={() => handleConnect(true)} className="w-full">
      <Plus className="h-4 w-4 mr-2" />
      Подключить ещё один WhatsApp
    </Button>
  </div>
);
```

#### 5. Создание новой сессии

```typescript
const handleConnect = async (forceNew = false) => {
  setConnectingStatus('loading');
  
  try {
    const result = await wppCreate(forceNew);
    
    if (result.status === 'qr_issued') {
      setQrCode(result.qrcode);
      setNewSession(result.session);
      // Начать polling
    }
    
    // Обновить список интеграций
    refetch();
  } catch (err) {
    // Обработка ошибок
  }
};
```

---

## Логика состояний

| Состояние | Отображение |
|-----------|-------------|
| Загрузка интеграций | Spinner |
| Нет WPP интеграций | Кнопка "Подключить WhatsApp" |
| Есть интеграции | Список сессий + кнопка "Добавить ещё" |
| Подключение новой | QR-код в диалоге |

---

## Ожидаемый результат

1. **После перезагрузки** - подключённые сессии отображаются из БД
2. **Можно добавить несколько сессий** - кнопка "Подключить ещё один WhatsApp"
3. **Статус проверяется онлайн** - при загрузке компонента проверяется актуальный статус через `wpp-status`

