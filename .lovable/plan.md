
# План: Исправление интеграции OnlinePBX согласно официальной документации API

## Проблема

Текущая реализация интеграции OnlinePBX не соответствует официальной документации API. 

**Что есть сейчас (неправильно):**
- Форма запрашивает "API Key ID" и "API Key Secret"
- Эти поля не существуют в личном кабинете OnlinePBX

**Как должно быть (по документации):**
- В ЛК OnlinePBX есть только **auth_key** (раздел "Интеграция → API")
- Через запрос на `{domain}/auth.json` с `auth_key` получаются `key_id` и `key`
- Эти `key_id:key` используются для авторизации всех последующих запросов

## Решение

### Шаг 1: Обновить UI компонент настроек

**Файл:** `src/components/admin/OnlinePBXSettings.tsx`

Изменения:
- Заменить два поля (`API Key ID` + `API Key Secret`) на одно поле **Auth Key**
- Обновить инструкцию:
  ```
  1. Войдите в личный кабинет OnlinePBX
  2. Перейдите в раздел «Интеграция» → «API»
  3. Скопируйте Auth Key в поле выше
  ```
- При сохранении система автоматически получит `key_id` и `key`

### Шаг 2: Обновить Edge Function для сохранения настроек

**Файл:** `supabase/functions/onlinepbx-settings/index.ts`

Изменения в POST-обработчике:
1. Принимать `authKey` вместо `apiKeyId` + `apiKeySecret`
2. При сохранении делать запрос на `https://api2.onlinepbx.ru/{domain}/auth.json`:
   ```javascript
   const response = await fetch(`https://api2.onlinepbx.ru/${pbxDomain}/auth.json`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ auth_key: authKey })
   });
   ```
3. Извлекать `key_id` и `key` из ответа
4. Сохранять в базу: `{ pbxDomain, authKey, keyId, keySecret }`

### Шаг 3: Обновить Edge Function для тестирования подключения

**Файл:** `supabase/functions/test-onlinepbx/index.ts`

Изменения:
1. Принимать `pbx_domain` и `auth_key`
2. Делать запрос на `auth.json` для получения `key_id` и `key`
3. Проверять успешность авторизации
4. Возвращать результат

### Шаг 4: Обновить Edge Function для звонков

**Файл:** `supabase/functions/onlinepbx-call/index.ts`

Изменения в `getOnlinePBXConfig`:
- Читать сохранённые `keyId` и `keySecret` (полученные через auth.json)
- Формировать заголовок `x-pbx-authentication` в формате `key_id:key` (без HMAC)

### Шаг 5: Обратная совместимость

Для существующих настроек:
- Если в базе есть старый формат (`apiKeyId` + `apiKeySecret`), продолжать их использовать
- При следующем сохранении — мигрировать на новый формат

---

## Технические детали

### Формат запроса auth.json

```
POST https://api2.onlinepbx.ru/{domain}/auth.json
Content-Type: application/json

{
  "auth_key": "UjdNdHhkV2w3OUtUNzgzako3WUNUTDdnY1Z0WjdqTWs"
}
```

### Формат ответа auth.json

```json
{
  "status": "1",
  "data": {
    "key_id": "abc123",
    "key": "xyz789..."
  }
}
```

### Формат авторизации для последующих запросов

```
x-pbx-authentication: key_id:key
```

Или (согласно документации):
```
apiKey=key_id:key
```

---

## Структура данных (новая)

```json
{
  "pbxDomain": "pbx11034.onpbx.ru",
  "authKey": "UjdNdHhkV2w3OUtUNzgzako3WUNUTDdnY1Z0WjdqTWs",
  "keyId": "abc123",
  "keySecret": "xyz789...",
  "webhook_key": "..."
}
```

---

## Файлы для изменения

| Файл | Описание изменений |
|------|-------------------|
| `src/components/admin/OnlinePBXSettings.tsx` | UI: одно поле Auth Key, обновлённая инструкция |
| `supabase/functions/onlinepbx-settings/index.ts` | Авторизация через auth.json при сохранении |
| `supabase/functions/test-onlinepbx/index.ts` | Тест через auth.json |
| `supabase/functions/onlinepbx-call/index.ts` | Использование key_id:key для авторизации |

---

## Важные замечания

1. **Новый API сервер**: Документация указывает `api2.onlinepbx.ru` (не `api.onlinepbx.ru`)
2. **auth_key** — это единственное что нужно пользователю скопировать из ЛК
3. **key_id и key** получаются автоматически и сохраняются в БД
4. Эти ключи могут истекать — возможно потребуется механизм обновления
