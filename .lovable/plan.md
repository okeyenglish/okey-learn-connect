
## План: Диагностика и исправление отправки WhatsApp сообщений

### Текущая ситуация
1. **Сервер**: Файлы `wpp-send/index.ts` и `_shared/wpp.ts` обновлены и содержат retry логику
2. **Проблема**: С UI не отправляются запросы к `wpp-send` - функция вообще не вызывается
3. **Логи**: Пусто на сервере, нет network requests в браузере

### Корневая причина
После анализа кода выяснилось, что проблема может быть в одном из мест:

1. **Авторизация** - `selfHostedApi.getAuthToken()` возвращает `null` → запрос блокируется до вызова API
2. **getMessengerSettings()** возвращает `null` → провайдер не определяется
3. **Ошибка в UI** - функция `sendTextMessage` не вызывается

### Решение: Добавить диагностическое логирование

**Файл 1:** `src/hooks/useWhatsApp.ts`

Добавить console.log в функцию `sendMessage` для понимания, где происходит сбой:

```typescript
const sendMessage = useCallback(async (params: SendMessageParams) => {
  setLoading(true);
  retryStatus.reset();
  
  try {
    console.log('[useWhatsApp] === SEND MESSAGE START ===');
    console.log('[useWhatsApp] Params:', params);

    const settings = await getMessengerSettings();
    console.log('[useWhatsApp] Settings:', settings);  // <-- Диагностика
    
    const provider = settings?.provider || 'greenapi';
    const functionName = provider === 'wpp' ? 'wpp-send' : ...;
    
    console.log('[useWhatsApp] Provider:', provider, 'Function:', functionName);
    
    // ... rest of code
```

**Файл 2:** `src/lib/selfHostedApi.ts`

Добавить логирование авторизации:

```typescript
export async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  console.log('[selfHostedApi] Auth session:', !!session, 'Token:', session?.access_token?.slice(0, 20) + '...');
  return session?.access_token || null;
}
```

### Альтернативное решение: Проверка на сервере

Выполните на сервере для тестирования с валидным токеном:

```bash
# 1. Получить токен авторизации (из браузера DevTools → Application → Local Storage → sb-api-academyos-auth-token)
# Или войти через API:
TOKEN=$(curl -s -X POST 'https://api.academyos.ru/auth/v1/token?grant_type=password' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}' | jq -r '.access_token')

# 2. Тест wpp-send с авторизацией
curl -X POST https://api.academyos.ru/functions/v1/wpp-send \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY5MDg4ODgzLCJleHAiOjE5MjY3Njg4ODN9.WEsCyaCdQvxzVObedC-A9hWTJUSwI_p9nCG1wlbaNEg" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"test_connection"}'

# 3. Проверить логи
docker compose logs functions --tail 50 | grep -E "(wpp-send|WppMsgClient)"
```

### Ожидаемый результат

После добавления логирования в консоли браузера будет видно:
- Получает ли `getMessengerSettings()` настройки WPP интеграции
- Есть ли авторизационный токен
- Какой endpoint вызывается

Это позволит точно определить место сбоя.

### Шаги

1. Я добавлю диагностическое логирование в код
2. После деплоя откройте DevTools → Console и попробуйте отправить сообщение
3. Скопируйте логи сюда для анализа
