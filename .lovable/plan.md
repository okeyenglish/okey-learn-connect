
## План: Диагностика отправки WhatsApp сообщений

### ✅ Выполнено

Добавлено диагностическое логирование в:

1. **`src/hooks/useWhatsApp.ts`** - `sendMessage()`:
   - Логирование params, phoneNumber
   - Логирование settings из БД (provider, isEnabled, wppSession, hasWppApiKey)
   - Логирование выбранного provider и functionName

2. **`src/lib/selfHostedApi.ts`** - `getAuthToken()`:
   - Логирование hasSession, hasToken
   - Превью токена (первые 30 символов)
   - Дата истечения токена

### Следующие шаги

1. Откройте DevTools → Console
2. Попробуйте отправить сообщение
3. Скопируйте логи `[useWhatsApp]` и `[selfHostedApi]` сюда

### Что искать в логах

- `[selfHostedApi] getAuthToken: { hasSession: false }` → Проблема авторизации
- `[useWhatsApp] Settings from DB: NULL` → Нет настроек WPP интеграции
- `[useWhatsApp] Provider: greenapi` → Вызывается не тот endpoint
