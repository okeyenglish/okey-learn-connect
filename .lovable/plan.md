

# План: Исправление добавления второго WhatsApp номера

## Проблема

При добавлении второго номера WhatsApp функция `createClient` вызывается с тем же `organizationId`, и WPP Platform возвращает **существующий apiKey** вместо создания нового. Этот ключ уже активирован для первого номера, поэтому ошибка 403 "Invalid API key" — это не race condition, а ожидаемое поведение.

## Корень проблемы

```typescript
// wpp-create/index.ts, строка 184
const newClient = await WppMsgClient.createClient(WPP_BASE_URL, WPP_SECRET, orgId);
// ↑ orgId один и тот же для всех номеров организации!
```

WPP Platform работает по схеме: **1 organizationId = 1 apiKey = 1 сессия**

## Решение

Для поддержки нескольких номеров нужно передавать **уникальный идентификатор** для каждого подключения:

### Вариант 1: Виртуальные суб-организации (рекомендуется)

Генерировать уникальный ID для каждого нового подключения:

```typescript
// Было:
const newClient = await WppMsgClient.createClient(WPP_BASE_URL, WPP_SECRET, orgId);

// Станет:
const subOrgId = `${orgId}__wpp__${crypto.randomUUID().substring(0, 8)}`;
const newClient = await WppMsgClient.createClient(WPP_BASE_URL, WPP_SECRET, subOrgId);
```

Это создаст уникальный apiKey для каждого WhatsApp номера.

## Изменения в коде

### Файл: `supabase/functions/wpp-create/index.ts`

1. **Убрать проверку на существующую интеграцию** при `force_recreate` или явном запросе на новый номер
2. **Генерировать уникальный subOrgId** для каждого нового подключения
3. **Создавать новую запись в messenger_integrations** вместо обновления существующей

```typescript
// При создании нового номера
const integrationUuid = crypto.randomUUID();
const subOrgId = `${orgId}__wpp__${integrationUuid.substring(0, 8)}`;

const newClient = await WppMsgClient.createClient(WPP_BASE_URL, WPP_SECRET, subOrgId);

// Сохраняем subOrgId в settings для будущей идентификации
const newSettings = {
  wppApiKey: newClient.apiKey,
  wppAccountNumber: newClient.session,
  wppSubOrgId: subOrgId,  // ← Новое поле
  wppJwtToken: jwtToken,
  wppJwtExpiresAt: jwtExpiresAt,
};

// ВСЕГДА создаём новую запись для нового номера
const { data: insertedIntegration, error: insertError } = await supabaseClient
  .from('messenger_integrations')
  .insert({
    organization_id: orgId,
    messenger_type: 'whatsapp',
    provider: 'wpp',
    name: 'WhatsApp (WPP)',
    is_active: true,
    is_primary: false,  // Первый номер остаётся primary
    webhook_key: crypto.randomUUID(),
    settings: newSettings,
  })
  .select()
  .single();
```

### Файл: Логика определения "нового номера"

Добавить параметр `add_new: true` в запрос для явного создания нового подключения:

```typescript
interface WppCreateRequest {
  force_recreate?: boolean;
  add_new?: boolean;  // ← Новый флаг для добавления второго номера
}
```

## Технические детали

| Параметр | Поведение |
|----------|-----------|
| `{}` (пустой) | Переподключить существующий номер |
| `{ add_new: true }` | Создать новый номер (новый apiKey) |
| `{ force_recreate: true }` | Пересоздать текущий номер |

## Ожидаемый результат

- Первый номер: `orgId` → apiKey1
- Второй номер: `orgId__wpp__abc123` → apiKey2
- Каждый номер получает уникальный apiKey
- Ошибка 403 исчезает

## Файлы для изменения

1. `supabase/functions/wpp-create/index.ts` — логика создания нового номера

