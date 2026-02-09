

# План исправления: Принудительный fallback по телефону в telegram-send

## Проблема

При отправке сообщения по Telegram ID (например `1495693588`) происходит ошибка, но fallback на телефон **не срабатывает**. Причина: условие `isPeerNotFound` проверяет конкретные английские фразы в тексте ошибки, но Wappi может возвращать ошибки в другом формате.

## Решение

Изменить логику fallback — **всегда пробовать телефон** если первая попытка по ID не удалась, независимо от текста ошибки.

## Файл для изменения

`supabase/functions/telegram-send/index.ts`

## Изменения

### 1. Упростить условие fallback (строки 401-455)

**Было:**
```typescript
if (!sendResult.success) {
  const errorMsg = sendResult.error || 'Failed to send message';
  const isPeerNotFound = errorMsg.toLowerCase().includes('peer not found') || 
                          errorMsg.toLowerCase().includes('peer_not_found') ||
                          errorMsg.toLowerCase().includes('no peer') ||
                          errorMsg.toLowerCase().includes('user not found') ||
                          errorMsg.toLowerCase().includes('chat not found');
  
  const usedIdNotPhone = recipientSource.includes('telegram_chat_id') || 
                          recipientSource.includes('telegram_user_id') ||
                          recipientSource.includes('telegram_username');
  
  if (isPeerNotFound && usedIdNotPhone) {
    // fallback logic...
  }
}
```

**Станет:**
```typescript
if (!sendResult.success) {
  const errorMsg = sendResult.error || 'Failed to send message';
  console.log(`[telegram-send] First attempt failed: ${errorMsg}, source: ${recipientSource}`);
  
  // Если использовали ID (не телефон), ВСЕГДА пробуем fallback по телефону
  const usedIdNotPhone = recipientSource.includes('telegram_chat_id') || 
                          recipientSource.includes('telegram_user_id') ||
                          recipientSource.includes('telegram_username') ||
                          recipientSource === 'none';
  
  if (usedIdNotPhone) {
    // fallback logic - БЕЗ проверки isPeerNotFound
  }
}
```

### 2. Добавить больше логов для диагностики

```typescript
console.log(`[telegram-send] Attempting fallback. Original recipient: ${recipient}, source: ${recipientSource}`);
console.log(`[telegram-send] Phone to try: ${phoneToTry}`);
```

### 3. Обработать случай когда phone совпадает с recipient

Если `phoneToTry === recipient` (т.е. уже пробовали по телефону), не делать повторную попытку:

```typescript
if (phoneToTry && phoneToTry !== recipient) {
  console.log(`[telegram-send] Phone fallback: trying ${phoneToTry}`);
  // send via phone...
} else if (phoneToTry === recipient) {
  console.log(`[telegram-send] Phone fallback skipped: already tried this phone`);
}
```

## Логика после исправления

```text
1. Отправка по telegram_user_id → ОШИБКА
2. Fallback: получить телефон клиента из client.phone
3. Нормализовать телефон (7XXXXXXXXXX)
4. Повторная отправка по телефону
5. Если успех → зелёная галочка
6. Если ошибка → показать "Клиент не найден в Telegram"
```

## Ожидаемый результат

- При ошибке отправки по Telegram ID система **автоматически** попробует отправить по телефону
- Работает для любых ошибок от Wappi (не только "peer not found")
- Улучшенные логи помогут диагностировать проблемы

## Техническое примечание

Этот файл нужно обновить и на self-hosted сервере через GitHub Actions или вручную скопировав в `/home/automation/supabase-project/volumes/functions/telegram-send/index.ts` и перезапустив контейнер функций.

