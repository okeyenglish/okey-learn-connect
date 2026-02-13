

# Исправление маршрутизации Telegram-бота

## Проблема

После удаления и переподключения интеграций бота, система всегда отправляет через primary (личный аккаунт), потому что:

1. Колонка `integration_id` в `chat_messages` была обнулена (при подготовке к удалению старых интеграций)
2. Metadata fallback находит старые `integration_id` от удалённых интеграций, пытается найти их в таблице `messenger_integrations`, не находит (они удалены), и переходит к primary
3. Фронтенд (`useTelegramWappi.ts`) никогда не передает `integrationId` при отправке -- нет механизма принудительной маршрутизации из чата

## Решение (2 изменения)

### 1. Edge Function: `telegram-send/index.ts` -- "мертвая ссылка" fallback

Когда smart routing нашёл `integration_id`, но интеграция не найдена в БД (удалена), вместо перехода к primary -- искать замену с тем же `profileId` среди активных интеграций:

```text
Текущая логика (строки 207-220):
  resolvedIntegrationId найден -> ищем в messenger_integrations -> НЕ НАЙДЕН -> integration = null -> primary fallback

Новая логика:
  resolvedIntegrationId найден -> ищем в messenger_integrations -> НЕ НАЙДЕН ->
    -> ищем ЛЮБУЮ активную telegram-интеграцию с тем же provider (wappi/telegram_crm) ->
    -> если нашли, используем её (это "замена" удалённой)
    -> если нет, тогда primary fallback
```

Конкретно: после строки 219, если `integration` = null и `resolvedIntegrationId` был найден, выполнить поиск замены среди всех активных telegram-интеграций организации. Логика: если нашёлся только один активный бот -- использовать его. Если несколько -- попробовать найти по совпадению `profileId` из body.

### 2. Фронтенд: `src/hooks/useTelegramWappi.ts` -- передача `integrationId` из чата

В функции `sendMessage` добавить опциональный параметр `integrationId` в `options`, и если он передан -- включать его в body запроса. Это позволит компонентам чата явно указывать через какую интеграцию отправлять.

Добавить в интерфейс options:
```typescript
options?: {
  phoneNumber?: string;
  chatId?: string;
  teacherId?: string;
  senderName?: string;
  telegramUserId?: string | number | null;
  integrationId?: string;  // NEW
}
```

И в каждый вариант body добавить:
```typescript
...(options?.integrationId ? { integrationId: options.integrationId } : {})
```

### Приоритет

Изменение 1 (edge function) -- критическое, решает проблему немедленно для всех существующих чатов. Изменение 2 -- улучшение для будущей надёжности.

