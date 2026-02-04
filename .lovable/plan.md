
# План: Исправление парсинга Authorization header

## Проблема

В Edge Functions `wpp-create` и `wpp-qr` используется строгое извлечение токена:
```typescript
const token = authHeader.replace('Bearer ', '');
```

Это ломается если:
- `bearer` с маленькой буквы
- `BEARER` заглавными
- Несколько пробелов после Bearer

## Решение

Заменить на регулярку, нечувствительную к регистру:
```typescript
const token = authHeader.replace(/^Bearer\s+/i, '');
```

## Изменения

### 1. supabase/functions/wpp-create/index.ts (строка 46)

```typescript
// БЫЛО:
const token = authHeader.replace('Bearer ', '');

// СТАНЕТ:
const token = authHeader.replace(/^Bearer\s+/i, '');
```

### 2. supabase/functions/wpp-qr/index.ts (строка 40)

```typescript
// БЫЛО:
const token = authHeader.replace('Bearer ', '');

// СТАНЕТ:
const token = authHeader.replace(/^Bearer\s+/i, '');
```

## Требования к деплою

После изменений необходимо обновить файлы на self-hosted сервере:

```bash
# Скопировать обновленные файлы
rsync -avz ./supabase/functions/wpp-create/index.ts automation@api.academyos.ru:/path/to/functions/wpp-create/
rsync -avz ./supabase/functions/wpp-qr/index.ts automation@api.academyos.ru:/path/to/functions/wpp-qr/

# Перезапустить functions
docker compose restart functions
```

## Дополнительно

Также стоит проверить другие WPP Edge Functions на аналогичную проблему:
- `wpp-status`
- `wpp-provision`
- `wpp-webhook`
