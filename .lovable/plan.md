
# Диагностика и исправление Telegram BOT и удаления интеграций

## Проблемы

1. **Telegram BOT не отправляет сообщения** -- входящие вебхуки приходят, но отправка обратно не работает
2. **Невозможно удалить "okeyenglish bot"** -- сервер недоступен при попытке удаления

## Анализ причин

### Проблема 1: BOT не отправляет

Функция `telegram-send` использует **Wappi API** (`/tapi/sync/message/send`) для отправки. Этот эндпоинт одинаков для личных аккаунтов и ботов. Однако есть несколько потенциальных проблем:

- **Wappi API может возвращать HTML вместо JSON** (ошибка авторизации, таймаут, rate-limiting), что приводит к крашу парсинга ответа
- **Ответ Wappi API не валидируется** на Content-Type перед парсингом -- если API вернет HTML (например, страницу авторизации или 502), `response.json()` упадет с ошибкой, но сообщение об ошибке будет неинформативным
- **Нет диагностического инструмента** -- невозможно понять, что именно отвечает Wappi на запрос отправки

### Проблема 2: Невозможно удалить интеграцию

- Удаление идет через `selfHostedDelete('messenger-integrations?id=XXX')` на self-hosted сервер
- При сетевой ошибке или таймауте пользователь видит неинформативное "Ошибка" без деталей
- Нет повторных попыток для DELETE-операций

## План исправлений

### Шаг 1: Улучшить обработку ответов Wappi API в `telegram-send`

В `supabase/functions/telegram-send/index.ts` -- добавить валидацию Content-Type перед `response.json()` в функции `sendMessage`:

- Проверять `Content-Type` заголовок ответа
- Если ответ не JSON (HTML, plain text) -- логировать первые 200 символов и возвращать понятную ошибку
- Добавить логирование HTTP статуса и заголовков для диагностики

### Шаг 2: Добавить кнопку "Тест отправки" для Telegram интеграций

В `src/components/admin/integrations/TelegramIntegrations.tsx`:

- Добавить пункт меню "Тестовая отправка" в выпадающее меню интеграции
- При нажатии -- вызывать `selfHostedPost('telegram-send', { text: 'Тестовое сообщение', ... })` с тестовым получателем
- Показывать результат (успех/ошибка с деталями) в toast-уведомлении

### Шаг 3: Улучшить обработку ошибок удаления

В `src/hooks/useMessengerIntegrations.ts`:

- Добавить более детальное отображение ошибки при удалении (включая HTTP статус и текст ошибки)
- Добавить таймаут для DELETE-запросов
- Показывать конкретную причину ошибки (сервер недоступен, таймаут, авторизация)

### Шаг 4: Добавить кнопку "Проверить подключение" для всех Wappi интеграций

Расширить существующую кнопку "Проверить Webhook" для проверки не только вебхука, но и возможности отправки:

- Вызвать Wappi API `/tapi/sync/get/status?profile_id=XXX` для проверки статуса профиля
- Показать статус (online/offline/error) и детали

## Технические детали

### Изменения в `supabase/functions/telegram-send/index.ts`

Функция `sendMessage` (строки 823-869) будет обновлена:

```typescript
// Перед response.json() добавить проверку Content-Type
const contentType = response.headers.get('content-type') || '';
if (!contentType.includes('application/json')) {
  const textBody = await response.text().catch(() => '');
  console.error(`[telegram-send] Wappi returned non-JSON (${contentType}):`, textBody.substring(0, 200));
  return {
    success: false,
    error: `Wappi API вернул неожиданный формат (${response.status}). Возможно проблема с авторизацией или сервер Wappi недоступен.`,
  };
}
```

### Изменения в `src/hooks/useMessengerIntegrations.ts`

Мутация `deleteMutation` будет обновлена для показа детальных ошибок:

```typescript
onError: (error: Error) => {
  const isNetworkError = error.message.includes('fetch') || error.message.includes('network');
  toast({
    title: 'Ошибка удаления',
    description: isNetworkError 
      ? 'Сервер недоступен. Проверьте подключение и попробуйте позже.'
      : error.message,
    variant: 'destructive',
  });
}
```

### Изменения в `src/components/admin/integrations/TelegramIntegrations.tsx`

Добавить кнопку проверки статуса профиля Wappi для диагностики проблем с BOT.
