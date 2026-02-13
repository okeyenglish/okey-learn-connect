

## Исправление отправки через Telegram Bot (Wappi `/botapi/`)

### Проблема

Функция `telegram-send` использует эндпоинт `/tapi/sync/message/send` для всех Wappi-интеграций. Но для Telegram Bot профилей правильный эндпоинт -- `/botapi/message/send` (подтверждено техподдержкой Wappi). Из-за этого профиль `e1d32a13-5a40` (OkeyEnglishBot) получает `"Wrong platform"`.

### Решение

#### 1. Расширить `TelegramSettings` в `_shared/types.ts`

Добавить необязательное поле `isBotProfile`:

```text
export interface TelegramSettings {
  profileId: string;
  apiToken: string;
  webhookUrl?: string;
  isBotProfile?: boolean;
}
```

#### 2. Обновить `sendTextMessage` и `sendFileMessage` в `telegram-send/index.ts`

Добавить параметр `isBotProfile` и выбирать API-префикс:

- Бот: `https://wappi.pro/botapi/message/send?profile_id=XXX`
- Бот (файл): `https://wappi.pro/botapi/message/file/url/send?profile_id=XXX`
- Номерной: `https://wappi.pro/tapi/sync/message/send?profile_id=XXX` (без изменений)
- Номерной (файл): `https://wappi.pro/tapi/sync/message/file/url/send?profile_id=XXX` (без изменений)

#### 3. Прокинуть флаг `isBotProfile` через весь код

В основном обработчике `telegram-send`:
- При выборе интеграции извлекать `isBotProfile` из `settings`
- Передавать его в `sendTextMessage`/`sendFileMessage`
- При fallback на альтернативные интеграции -- также читать `isBotProfile` из каждой

#### 4. Авто-фоллбэк при "Wrong platform"

Если Wappi вернул `"Wrong platform"`:
- Повторить запрос с противоположным префиксом (`/tapi/` -> `/botapi/` и наоборот)
- Если помогло -- обновить `isBotProfile` в БД для этой интеграции

#### 5. Авто-детект в `telegram-webhook`

Входящий вебхук содержит `"platform": "telegram_bot"`. При обработке:
- Если `platform === "telegram_bot"` и у интеграции нет `isBotProfile: true` -- автоматически обновить настройки

#### 6. SQL для немедленного исправления на self-hosted

```text
UPDATE messenger_integrations 
SET settings = jsonb_set(settings::jsonb, '{isBotProfile}', 'true')
WHERE id = '1af258ea-1c15-4ede-85b9-6d9c720ee6ed';
```

### Затрагиваемые файлы

- `supabase/functions/_shared/types.ts` -- добавить `isBotProfile` в `TelegramSettings`
- `supabase/functions/telegram-send/index.ts` -- главные изменения (эндпоинты, прокидка флага, авто-фоллбэк)
- `supabase/functions/telegram-webhook/index.ts` -- авто-детект `platform: "telegram_bot"`
- `supabase/functions/telegram-get-avatar/index.ts` -- аналогичная смена префикса для аватаров
- `supabase/functions/telegram-get-contact-info/index.ts` -- аналогичная смена префикса

