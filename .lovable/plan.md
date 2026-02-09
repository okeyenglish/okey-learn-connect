
# План: Fallback на другую Telegram интеграцию при ошибке

## Суть идеи

Если у организации настроено **несколько Telegram интеграций** (например, Wappi и Telegram CRM, или два разных Wappi аккаунта), и первая интеграция не смогла доставить сообщение (PEER_NOT_FOUND), система автоматически попробует отправить через **другую доступную интеграцию**.

Это полезно когда:
- У одного аккаунта нет peer с клиентом, а у другого есть
- Один аккаунт временно недоступен
- Клиент общался с разных номеров

## Текущая логика (до изменения)

```text
1. Smart routing: найти integration_id из последнего входящего сообщения
2. Если нашли → использовать эту интеграцию
3. Если не нашли → использовать primary интеграцию
4. Отправка → ошибка PEER_NOT_FOUND
5. Fallback по телефону (в той же интеграции)
6. Всё ещё ошибка → показать "Клиент не найден в Telegram"
```

## Новая логика (после изменения)

```text
1. Smart routing: найти integration_id из последнего входящего сообщения
2. Если нашли → использовать эту интеграцию
3. Если не нашли → использовать primary интеграцию
4. Отправка → ошибка PEER_NOT_FOUND
5. Fallback по телефону (в той же интеграции) → ошибка
6. === НОВОЕ: FALLBACK НА ДРУГУЮ ИНТЕГРАЦИЮ ===
   - Получить ВСЕ telegram интеграции организации (кроме уже попробованной)
   - Для каждой интеграции:
     - Если wappi → попробовать через telegram-send с этой интеграцией
     - Если telegram_crm → попробовать через telegram-crm-send
   - Если хоть одна успешна → вернуть успех
7. Все интеграции не смогли → показать "Клиент не найден в Telegram"
```

## Файл для изменения

`supabase/functions/telegram-send/index.ts`

## Детали реализации

### Шаг 1: После неудачи первой интеграции — найти альтернативы

После блока fallback по телефону (строка ~572), если всё ещё `!sendResult.success`:

```typescript
// === FALLBACK TO OTHER INTEGRATIONS ===
if (!sendResult.success) {
  console.log('[telegram-send] Primary integration failed, looking for alternative integrations');
  
  // Get all telegram integrations except the one we already tried
  const { data: alternativeIntegrations } = await supabase
    .from('messenger_integrations')
    .select('id, provider, settings, is_enabled')
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'telegram')
    .eq('is_enabled', true)
    .neq('id', integration?.id || '') // Exclude the one we already tried
    .order('is_primary', { ascending: false });
  
  if (alternativeIntegrations && alternativeIntegrations.length > 0) {
    console.log(`[telegram-send] Found ${alternativeIntegrations.length} alternative integration(s)`);
    
    for (const altIntegration of alternativeIntegrations) {
      console.log(`[telegram-send] Trying alternative: ${altIntegration.provider} (${altIntegration.id})`);
      
      if (altIntegration.provider === 'wappi') {
        // Try Wappi with alternative account
        const altSettings = altIntegration.settings as TelegramSettings;
        if (altSettings?.profileId && altSettings?.apiToken) {
          // Try with ID first, then phone
          let altRecipient = recipient;
          let altResult = await sendTextMessage(altSettings.profileId, altRecipient, text || '', altSettings.apiToken);
          
          if (!altResult.success && fallbackPhoneNormalized && fallbackPhoneNormalized !== altRecipient) {
            altResult = await sendTextMessage(altSettings.profileId, fallbackPhoneNormalized, text || '', altSettings.apiToken);
            if (altResult.success) altRecipient = fallbackPhoneNormalized;
          }
          
          if (altResult.success) {
            console.log(`[telegram-send] Alternative Wappi integration SUCCEEDED!`);
            sendResult = altResult;
            break;
          }
        }
      } else if (altIntegration.provider === 'telegram_crm') {
        // Try Telegram CRM
        try {
          const crmResponse = await fetch(`${supabaseUrl}/functions/v1/telegram-crm-send`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              clientId: resolvedClientId,
              text,
              fileUrl,
              fileName,
              fileType,
              integrationId: altIntegration.id,
            }),
          });
          
          const crmResult = await crmResponse.json();
          if (crmResult.success) {
            console.log(`[telegram-send] Alternative Telegram CRM integration SUCCEEDED!`);
            sendResult = { success: true, messageId: crmResult.messageId };
            break;
          }
        } catch (e) {
          console.error(`[telegram-send] Alternative Telegram CRM failed:`, e);
        }
      }
    }
  } else {
    console.log('[telegram-send] No alternative integrations available');
  }
}
```

### Шаг 2: Обеспечить корректный возврат результата

Если альтернативная интеграция успешна, код продолжает выполнение и сохраняет сообщение в БД как обычно.

### Шаг 3: Улучшить логирование

Добавить в логи:
- Какая интеграция была первичной
- Сколько альтернатив найдено
- Какая альтернатива сработала

## Пример сценария

| Шаг | Действие | Результат |
|-----|----------|-----------|
| 1 | Smart routing → Wappi (ID: abc123) | Выбрана |
| 2 | Отправка по telegram_user_id `1212686911` | PEER_NOT_FOUND |
| 3 | Fallback по телефону `79161234567` | PEER_NOT_FOUND |
| 4 | Ищем альтернативы → Telegram CRM (ID: def456) | Найдена |
| 5 | Отправка через Telegram CRM | УСПЕХ! |
| 6 | Сообщение доставлено | Зелёная галочка |

## Риски и ограничения

- Если все интеграции не имеют peer с клиентом, fallback не поможет
- Увеличивается задержка при неудачах (проверяем несколько интеграций)
- Сообщение может уйти с "неожиданного" аккаунта (но это лучше чем не уйти вообще)

## Как тестировать

1. Настройте 2+ Telegram интеграции (Wappi + Telegram CRM или 2 Wappi)
2. Найдите клиента, у которого peer есть только с одним из аккаунтов
3. Отправьте сообщение
4. Ожидание: первая попытка fail → вторая интеграция success

## Техническая сводка

| Параметр | Значение |
|----------|----------|
| Файл | `supabase/functions/telegram-send/index.ts` |
| Строки изменения | ~575-650 (после существующего fallback) |
| Новые зависимости | Нет |
| Влияние на другие функции | Нет |
