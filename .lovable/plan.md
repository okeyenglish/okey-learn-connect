
# План: Добавить обработку ошибки IMPORT_FAILED в Wappi Telegram

## Проблема

При отправке сообщения через Wappi Telegram появляется ошибка **IMPORT_FAILED**. Это означает, что Wappi не может импортировать (найти) получателя по указанному номеру телефона в Telegram.

Текущая логика fallback обрабатывает только ошибки:
- `peer not found`
- `peer_not_found`
- `no peer`

Но **не** обрабатывает `IMPORT_FAILED`, хотя это по сути та же самая ситуация — контакт не найден в Telegram.

## Решение

Добавить `IMPORT_FAILED` в список ошибок, которые триггерят:
1. Fallback на альтернативный номер телефона
2. Fallback на другие Telegram интеграции
3. Корректное сообщение пользователю

## Файл для изменения

`supabase/functions/telegram-send/index.ts`

## Детали изменений

### 1. Добавить helper-функцию для проверки "контакт не найден"

```typescript
// Helper function to check if error indicates contact not found
function isContactNotFoundError(errorMsg: string): boolean {
  const lower = errorMsg.toLowerCase();
  return lower.includes('peer not found') ||
         lower.includes('peer_not_found') ||
         lower.includes('no peer') ||
         lower.includes('import_failed') ||
         lower.includes('import failed');
}
```

### 2. Заменить проверки в fallback логике

**Строка ~525-530 (первый fallback на телефон):**
Добавить логирование типа ошибки для диагностики.

**Строка ~676-679 (финальная проверка):**
Заменить:
```typescript
const isFinalPeerNotFound = finalErrorMsg.toLowerCase().includes('peer not found') || 
                            finalErrorMsg.toLowerCase().includes('peer_not_found') ||
                            finalErrorMsg.toLowerCase().includes('no peer');
```

На:
```typescript
const isFinalPeerNotFound = isContactNotFoundError(finalErrorMsg);
```

### 3. Обновить сообщение об ошибке

Сделать сообщение более информативным:
```typescript
error: 'Клиент не найден в Telegram (IMPORT_FAILED/PEER_NOT_FOUND). Попросите клиента написать вам первым, чтобы установить связь.',
```

## Технические детали

| Параметр | Значение |
|----------|----------|
| Файл | `supabase/functions/telegram-send/index.ts` |
| Строки изменения | ~676-684 (финальная обработка ошибки) |
| Новые функции | `isContactNotFoundError()` — helper для проверки типа ошибки |
| Влияние | Улучшенное распознавание ошибок Wappi, корректный fallback |

## Ожидаемый результат

После изменений:
- Ошибка `IMPORT_FAILED` будет триггерить fallback на другие интеграции
- Если все интеграции не смогли доставить — пользователь увидит понятное сообщение
- В логах будет видно какой тип ошибки вызвал fallback

## Почему возникает IMPORT_FAILED

Wappi для Telegram работает через **клиентское API** (не бот API). Это означает:
- Чтобы отправить сообщение, получатель должен быть в контактах ИЛИ ранее писал в этот аккаунт
- Если просто указать номер телефона незнакомого человека — Wappi не сможет его "импортировать" в Telegram
- Это ограничение самого Telegram, не Wappi

## Рекомендация пользователю

Для успешной отправки через Wappi Telegram:
1. Клиент должен **первым написать** в Telegram-аккаунт организации
2. ИЛИ добавить номер клиента в контакты Telegram-аккаунта вручную
