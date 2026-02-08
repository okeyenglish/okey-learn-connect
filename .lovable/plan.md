
# План диагностики Telegram Wappi Webhook

## Суть проблемы

Webhook зарегистрирован в Wappi, но входящие сообщения не появляются. Нужно понять:
1. Доступен ли webhook endpoint извне?
2. Какой URL реально зарегистрирован в Wappi?
3. Приходят ли вообще запросы на Edge Function?

## Решение: Добавить диагностику в UI

### 1. Кнопка "Проверить webhook" в списке интеграций

Добавить кнопку которая:
- Делает GET-запрос к `https://api.academyos.ru/functions/v1/telegram-webhook?profile_id=XXX`
- Показывает результат: `ok: true` значит endpoint доступен
- Если ошибка — показывает текст ошибки

### 2. Показать актуальный Webhook URL

Убедиться что в UI отображается **правильный** URL:
- Для Wappi Telegram: `?profile_id=XXX` (не хэш в path)
- Проверить что `settings.profileId` реально заполнен

### 3. Добавить логирование в telegram-webhook

Добавить запись в таблицу `webhook_logs` при каждом вызове для отладки:
- Зафиксировать что запрос пришёл
- Записать profile_id из URL и payload
- Записать результат поиска организации

## Изменения

| Файл | Изменение |
|------|-----------|
| `src/components/admin/integrations/IntegrationsList.tsx` | Добавить кнопку "Проверить" рядом с каждой Telegram Wappi интеграцией |
| `supabase/functions/telegram-webhook/index.ts` | Добавить запись в webhook_logs для диагностики |

## Техническая реализация

### Кнопка проверки webhook

```typescript
const handleTestWebhook = async (integration: MessengerIntegration) => {
  const profileId = integration.settings?.profileId;
  if (!profileId) {
    toast({ title: 'Ошибка', description: 'Profile ID не задан' });
    return;
  }
  
  try {
    const url = `https://api.academyos.ru/functions/v1/telegram-webhook?profile_id=${profileId}`;
    const res = await fetch(url, { method: 'GET' });
    const data = await res.json();
    
    if (data.ok) {
      toast({ 
        title: 'Webhook доступен', 
        description: `Endpoint отвечает. Profile ID: ${data.profileId}` 
      });
    } else {
      toast({ 
        title: 'Проблема с webhook', 
        description: JSON.stringify(data),
        variant: 'destructive'
      });
    }
  } catch (e) {
    toast({ 
      title: 'Webhook недоступен', 
      description: e.message,
      variant: 'destructive'
    });
  }
};
```

### Логирование в telegram-webhook

```typescript
// В начале POST обработчика добавить:
try {
  await supabase.from('webhook_logs').insert({
    messenger_type: 'telegram',
    event_type: 'webhook-received',
    webhook_data: {
      url: url.toString(),
      queryProfileId,
      pathProfileId,
      payloadProfileId: messages[0]?.profile_id,
      messagesCount: messages.length,
      timestamp: new Date().toISOString()
    },
    processed: false
  });
} catch (logErr) {
  console.error('Failed to log webhook:', logErr);
}
```

## Важно

После реализации:
1. Задеплоить Edge Function на self-hosted
2. Нажать "Проверить" в UI для Telegram Wappi интеграции
3. Если `ok: true` — значит endpoint работает, проблема в Wappi (не шлёт webhook)
4. Если ошибка — проверить nginx/routing на self-hosted
5. Отправить тестовое сообщение в Telegram и проверить webhook_logs
