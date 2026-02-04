# WPP миграция на msg.academyos.ru - ЗАВЕРШЕНО ✅

## Статус: Полностью мигрировано

Дата миграции: 2026-02-04

---

## Что было сделано

### 1. SDK `supabase/functions/_shared/wpp.ts`
- ✅ Создан новый `WppMsgClient` для API msg.academyos.ru
- ✅ Сохранен старый `WppClient` для обратной совместимости

### 2. Edge Functions обновлены
- ✅ `wpp-start` - использует настройки из `messenger_integrations`
- ✅ `wpp-status` - новые эндпоинты `/api/accounts/{number}/status`
- ✅ `wpp-send` - новый формат `/api/messages/text|image|video|file`
- ✅ `wpp-webhook` - парсит новый формат событий
- ✅ `wpp-disconnect` - `DELETE /api/accounts/{number}`

### 3. UI обновлен
- ✅ `WhatsAppIntegrations.tsx` - новые поля `wppApiKey` и `wppAccountNumber`

---

## Новая архитектура

### Аутентификация
```
POST /auth/token { apiKey } → { token }
```

### Настройки в `messenger_integrations.settings`
```json
{
  "wppApiKey": "API_KEY_организации",
  "wppAccountNumber": "79990001122"
}
```

### Эндпоинты нового API
| Операция | Эндпоинт |
|----------|----------|
| Токен | `POST /auth/token` |
| Старт аккаунта | `POST /api/accounts/start` |
| Статус | `GET /api/accounts/{number}/status` |
| QR код | `GET /api/accounts/{number}/qr` |
| Отключение | `DELETE /api/accounts/{number}` |
| Webhook | `POST /api/webhooks/{number}` |
| Текст | `POST /api/messages/text` |
| Изображение | `POST /api/messages/image` |
| Видео | `POST /api/messages/video` |
| Файл | `POST /api/messages/file` |
| Аудио | `POST /api/messages/audio` |

### Формат сообщений
```json
{
  "account": "79990001122",
  "to": "79991112233",
  "text": "Hello!"
}
```

### Формат webhook событий
```json
{
  "id": "evt_123",
  "type": "message.incoming",
  "created": 1234567890,
  "data": {
    "account": "79990001122",
    "from": "79991112233",
    "text": "Привет"
  }
}
```

---

## Типы событий webhook
- `message.incoming` - входящее сообщение
- `qr` - QR код для сканирования
- `connected` - аккаунт подключен
- `offline` - аккаунт отключен
- `message.sent` - сообщение отправлено
- `sla.violation` - нарушение SLA
- `message.dead` - сообщение не доставлено (DLQ)
