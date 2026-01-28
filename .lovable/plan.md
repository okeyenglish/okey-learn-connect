

# План: Исправление синтаксической ошибки в onlinepbx-webhook

## Проблема

Edge Function `onlinepbx-webhook` не запускается на self-hosted сервере из-за синтаксической ошибки:

```
Uncaught SyntaxError: Identifier 'rawFrom' has already been declared
at file:///...onlinepbx-webhook/index.ts:304:13
```

### Причина ошибки

Переменные `rawFrom` и `rawTo` объявлены **дважды** в одной области видимости (внутри блока `if (req.method === 'POST')`):

1. **Строки 207-209** — для логирования raw webhook:
```typescript
const rawFrom = (webhookData as any).from || (webhookData as any).src || ...;
const rawTo = (webhookData as any).to || (webhookData as any).dst || ...;
const phoneForLog = rawFrom || rawTo;
```

2. **Строки 364-365** — для обработки звонка:
```typescript
const rawFrom = (webhookData as any).caller || webhookData.from || ...;
const rawTo = (webhookData as any).callee || webhookData.to || ...;
```

## Решение

Переименовать первый набор переменных (для логирования) чтобы избежать конфликта:
- `rawFrom` → `logRawFrom`
- `rawTo` → `logRawTo`
- Обновить использование этих переменных в блоке записи в webhook_logs

## Изменения в файле

### Файл: `supabase/functions/onlinepbx-webhook/index.ts`

**Строки 207-221 — До:**
```typescript
const rawFrom = (webhookData as any).from || (webhookData as any).src || (webhookData as any).caller_number || '';
const rawTo = (webhookData as any).to || (webhookData as any).dst || (webhookData as any).called_number || '';
const phoneForLog = rawFrom || rawTo;
...
  _phone_from: rawFrom,
  _phone_to: rawTo,
```

**После:**
```typescript
const logRawFrom = (webhookData as any).from || (webhookData as any).src || (webhookData as any).caller_number || '';
const logRawTo = (webhookData as any).to || (webhookData as any).dst || (webhookData as any).called_number || '';
const phoneForLog = logRawFrom || logRawTo;
...
  _phone_from: logRawFrom,
  _phone_to: logRawTo,
```

## Деплой на Self-Hosted

После применения изменений в Lovable, нужно:

1. **Скопировать обновлённые функции на сервер:**
```bash
rsync -avz --delete \
  ./supabase/functions/ \
  automation@api.academyos.ru:/home/automation/supabase-project/volumes/functions/
```

2. **Перезапустить Edge Runtime:**
```bash
ssh automation@api.academyos.ru "cd /home/automation/supabase-project && docker compose restart functions"
```

3. **Проверить логи:**
```bash
docker compose logs --tail 20 functions
```

4. **Отправить тестовый webhook от OnlinePBX**

## Ожидаемый результат

- Функция `onlinepbx-webhook` успешно запустится
- Webhook от OnlinePBX будет обработан
- Звонок появится в `call_logs`
- Диагностическая панель покажет данные

