

# План: Упрощённый флоу подключения WPP WhatsApp

## Текущий флоу (сложный)
```text
Пользователь → Вводит API Key → Вводит номер телефона → Сохраняет → Нажимает "Подключить" → QR → Сканирует
```

## Новый флоу (упрощённый)
```text
Пользователь → Нажимает "Подключить WhatsApp" → QR появляется сразу → Сканирует → Готово!
```

---

## Архитектура решения

### Ключевые изменения:
1. **Глобальный API Key** — один ключ для всех организаций, хранится в секретах Supabase (`WPP_API_KEY`)
2. **Автоматический account number** — генерируется на основе `organization_id` (например: `org_${orgId.slice(0,8)}`)
3. **Новый Edge Function** — `wpp-provision` который создаёт интеграцию + сразу запускает аккаунт

---

## Новый Edge Function: `wpp-provision`

### Логика:
```text
POST /functions/v1/wpp-provision
Authorization: Bearer <user_jwt>

1. Получить organization_id пользователя
2. Проверить, есть ли уже WPP интеграция
   - Если да → вернуть статус/QR существующего аккаунта
   - Если нет → создать новую интеграцию
3. Сгенерировать account_number: `org_${orgId.substring(0,8)}`
4. Использовать глобальный WPP_API_KEY из env
5. Вызвать WPP Platform API:
   - POST /api/accounts/start { number }
   - POST /api/webhooks/{number} { url }
6. Получить QR код (если нужен)
7. Вернуть { status, qrcode, integration_id }
```

### Response:
```text
{
  "success": true,
  "status": "qr_issued" | "connected" | "starting",
  "qrcode": "base64...",   // если status = qr_issued
  "integration_id": "uuid",
  "account_number": "org_abc12345"
}
```

---

## Изменения в UI

### `WhatsAppIntegrations.tsx`
- Для провайдера `wpp` скрыть все поля настроек (не нужны wppApiKey, wppAccountNumber)
- Добавить отдельную кнопку "Быстрое подключение" которая сразу вызывает `wpp-provision`
- Показать QR код в модалке сразу после клика

### Новый компонент: `WppQuickConnect.tsx`
```text
1. Кнопка "Подключить WhatsApp"
2. При клике → POST wpp-provision
3. Показать QR в модалке
4. Polling статуса каждые 3 секунды
5. При status=connected → закрыть модалку, показать toast "Подключено!"
```

---

## Файлы для создания/изменения

| Файл | Действие | Описание |
|------|----------|----------|
| `supabase/functions/wpp-provision/index.ts` | Создать | Новый Edge Function для auto-provisioning |
| `src/components/admin/integrations/WppQuickConnect.tsx` | Создать | Компонент с QR модалкой |
| `src/components/admin/integrations/WhatsAppIntegrations.tsx` | Изменить | Добавить WppQuickConnect для provider=wpp |
| `src/lib/wppApi.ts` | Изменить | Добавить `wppProvision()` функцию |

---

## Секреты

Нужен новый секрет:
- **WPP_API_KEY** — глобальный API ключ для доступа к msg.academyos.ru

---

## Технические детали

### Edge Function `wpp-provision`
```text
// Псевдокод
Deno.serve(async (req) => {
  // 1. Auth check
  const user = await getUser(req)
  const orgId = await getOrgId(user.id)
  
  // 2. Check existing integration
  const existing = await supabase
    .from('messenger_integrations')
    .select()
    .eq('organization_id', orgId)
    .eq('provider', 'wpp')
    .maybeSingle()
  
  // 3. Generate account number
  const accountNumber = `org_${orgId.substring(0, 8)}`
  
  // 4. Create or update integration
  let integrationId = existing?.id
  if (!existing) {
    const { data } = await supabase
      .from('messenger_integrations')
      .insert({
        organization_id: orgId,
        messenger_type: 'whatsapp',
        provider: 'wpp',
        name: 'WhatsApp (WPP)',
        is_primary: true,
        is_enabled: true,
        settings: { wppAccountNumber: accountNumber }
      })
      .select()
      .single()
    integrationId = data.id
  }
  
  // 5. Start account on WPP platform
  const WPP_API_KEY = Deno.env.get('WPP_API_KEY')
  const wpp = new WppMsgClient({ baseUrl: WPP_BASE_URL, apiKey: WPP_API_KEY })
  
  const webhookUrl = `${SUPABASE_URL}/functions/v1/wpp-webhook?account=${accountNumber}`
  const result = await wpp.ensureAccountWithQr(accountNumber, webhookUrl, 30)
  
  // 6. Return result
  return { 
    success: true,
    status: result.state,
    qrcode: result.state === 'qr' ? result.qr : undefined,
    integration_id: integrationId,
    account_number: accountNumber
  }
})
```

### UI компонент WppQuickConnect
```text
// Псевдокод React
function WppQuickConnect() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'qr' | 'connected'>('idle')
  const [qrCode, setQrCode] = useState<string | null>(null)
  
  const handleConnect = async () => {
    setStatus('loading')
    const result = await selfHostedPost('wpp-provision', {})
    
    if (result.data?.status === 'qr_issued') {
      setQrCode(result.data.qrcode)
      setStatus('qr')
      startPolling(result.data.integration_id)
    } else if (result.data?.status === 'connected') {
      setStatus('connected')
      toast.success('WhatsApp подключен!')
    }
  }
  
  return (
    <Dialog>
      <Button onClick={handleConnect}>
        Подключить WhatsApp
      </Button>
      
      {status === 'qr' && (
        <DialogContent>
          <QRCodeSVG value={qrCode} size={256} />
          <p>Отсканируйте QR в WhatsApp на телефоне</p>
        </DialogContent>
      )}
    </Dialog>
  )
}
```

---

## Результат

После реализации:
- Пользователь видит одну кнопку "Подключить WhatsApp"
- Нажимает → видит QR
- Сканирует телефоном → подключено
- Никаких API ключей, никаких номеров вводить не нужно!

