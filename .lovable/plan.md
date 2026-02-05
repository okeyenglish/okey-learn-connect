

## Исправление: Использование session name из WPP Platform

### Проблема
В базе данных self-hosted сервера сохранён старый `wppAccountNumber = "client_system"`, хотя WPP Platform генерирует уникальные session ID (например `"0000000000001"`). При повторном подключении код находит существующую интеграцию и не создаёт новый клиент.

### Решение

#### Шаг 1: Немедленное исправление на сервере

Удалить старую интеграцию в базе, чтобы при следующем подключении создался новый клиент с правильным session ID:

```bash
# На self-hosted сервере
docker exec -it supabase-db psql -U postgres -d postgres -c "
  DELETE FROM messenger_integrations 
  WHERE provider = 'wpp' 
  AND settings->>'wppAccountNumber' = 'client_system';
"
```

#### Шаг 2: Улучшение кода (опционально)

Добавить параметр `force_recreate` в `wpp-create`, чтобы можно было пересоздать клиент без удаления записи в базе.

**Файл: `supabase/functions/wpp-create/index.ts`**

1. Добавить в интерфейс запроса:
```typescript
interface WppCreateRequest {
  force_recreate?: boolean;
}
```

2. Изменить условие проверки существующей интеграции (строки 79-80):
```typescript
const body = await req.json().catch(() => ({})) as WppCreateRequest;
const forceRecreate = body.force_recreate === true;

// If integration exists with credentials AND not force recreate
if (!forceRecreate && existingIntegration && settings.wppApiKey && settings.wppAccountNumber) {
  // ... existing logic
}
```

Это позволит UI передать `force_recreate: true` для принудительного пересоздания сессии.

---

### Порядок действий

1. **Немедленно**: Выполнить SQL команду на сервере для удаления старой интеграции
2. **После удаления**: Нажать "Подключить WhatsApp" снова - будет создан новый клиент с правильным session ID
3. **Опционально**: Применить изменения в код для добавления `force_recreate`

### Техническая деталь

WPP Platform API `/api/integrations/wpp/create` возвращает:
```json
{
  "session": "0000000000001",  // ← уникальный ID сессии
  "apiKey": "...",
  "status": "starting"
}
```

Этот `session` должен сохраняться в `settings.wppAccountNumber` и использоваться во всех последующих API вызовах.

