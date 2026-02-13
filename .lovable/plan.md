

# Исправление ошибок маршрутизации в telegram-send

## Найденные ошибки

### Ошибка 1: `integration_id` не сохраняется на исходящих сообщениях

В `telegram-send/index.ts` (строки 942-955) при сохранении отправленного сообщения в БД поле `integration_id` **не записывается**:

```text
const messageRecord = {
  organization_id,
  message_text,
  message_type: 'manager',
  messenger_type: 'telegram',
  ...
  // integration_id ← ОТСУТСТВУЕТ!
  metadata: { sender_name: ... },  // integration_id тоже нет в metadata
};
```

Из-за этого smart routing никогда не находит `integration_id` в истории сообщений, т.к. входящих сообщений от этого клиента нет (или они были до внедрения smart routing), а на исходящих `integration_id = null`.

### Ошибка 2: Интеграция `0fe16f2c` (профиль `e1d32a13-5a40`) -- "Wrong platform"

Эта интеграция стабильно отвечает `{"detail":"Wrong platform","status":"error"}`. Это означает, что профиль `e1d32a13-5a40` в Wappi привязан к **WhatsApp**, а не к Telegram. Но в таблице `messenger_integrations` он записан как `messenger_type = 'telegram'`.

Каждый раз при отправке система тратит запрос на заведомо нерабочую интеграцию.

### Ошибка 3: Smart routing ссылается на удаленную интеграцию `6604a4a0`

В логах видно: `Smart routing (client): 6604a4a0` -- но этой интеграции нет в списке активных. Dead-link fallback срабатывает, но может выбрать неправильную замену (например, `0fe16f2c` с "Wrong platform").

## План исправления

### 1. Сохранять `integration_id` на исходящих сообщениях

Файл: `supabase/functions/telegram-send/index.ts`, строки 942-955

Добавить в `messageRecord`:
- `integration_id` -- ID интеграции, через которую фактически отправлено
- `integration_id` в `metadata` -- для self-hosted совместимости

```text
Было:
  metadata: { sender_name: body.senderName || null }

Станет:
  integration_id: integration?.id || resolvedIntegrationId || null,
  metadata: {
    sender_name: body.senderName || null,
    integration_id: integration?.id || resolvedIntegrationId || null
  }
```

Важно: если сообщение отправлено через альтернативную интеграцию (fallback), нужно записать ID **той интеграции, которая успешно отправила**, а не первоначальной.

### 2. Отслеживать фактически использованную интеграцию

Сейчас когда fallback-интеграция успешно отправляет, переменная `integration` не обновляется. Нужно добавить переменную `actualIntegrationId` и обновлять её при успешной альтернативной отправке.

Строки 854-858:
```text
Было:
  sendResult = altResult;
  recipientSource = `alternative wappi (${altIntegration.id})`;

Станет:
  sendResult = altResult;
  recipientSource = `alternative wappi (${altIntegration.id})`;
  actualIntegrationId = altIntegration.id;  // Запоминаем кто реально отправил
```

### 3. Удалить/исправить интеграцию `0fe16f2c`

Это действие нужно выполнить в БД на self-hosted сервере:

```sql
-- Вариант А: Удалить нерабочую интеграцию
DELETE FROM messenger_integrations WHERE id = '0fe16f2c-5d1c-4d62-8b28-20e7faf571ef';

-- Вариант Б: Исправить тип на whatsapp (если профиль нужен для WhatsApp)
UPDATE messenger_integrations 
SET messenger_type = 'whatsapp' 
WHERE id = '0fe16f2c-5d1c-4d62-8b28-20e7faf571ef';
```

## Файлы для изменения

| Файл | Что меняем |
|---|---|
| `supabase/functions/telegram-send/index.ts` | Добавить `actualIntegrationId`, сохранять `integration_id` в `messageRecord` и `metadata` |

## Ожидаемый результат

1. После отправки сообщения в БД сохраняется `integration_id` фактически использованной интеграции
2. При следующей отправке smart routing найдет этот `integration_id` и отправит через ту же интеграцию
3. Удаление `0fe16f2c` уберет ошибку "Wrong platform" и ускорит fallback
4. Клиент будет получать ответы через тот же аккаунт, через который уже шла переписка

