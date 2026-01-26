
# План: Исправление Edge Function onlinepbx-settings

## Проблема

Edge Function `onlinepbx-settings` возвращает ошибку **404 "User profile not found"** при попытке сохранить или загрузить настройки OnlinePBX.

### Причина ошибки

В коде Edge Function есть запрос:
```typescript
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('organization_id, role')  // <-- ОШИБКА: колонка role не существует!
  .eq('id', user.id)
  .single();
```

**Таблица `profiles` не содержит колонку `role`**. Роли пользователей хранятся в отдельной таблице `user_roles`.

Структура таблицы `profiles`:
- id, organization_id, first_name, last_name, email, phone, avatar_url, branch, is_active, created_at, updated_at

Роли проверяются через:
- Таблицу `user_roles` (user_id, role)
- Функцию `has_role(user_id, role)`

---

## Решение

### Шаг 1: Исправить запрос к profiles

Убрать `role` из SELECT:

```typescript
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('organization_id')  // Убрали role
  .eq('id', user.id)
  .single();
```

### Шаг 2: Получить роль отдельным запросом

Добавить запрос к таблице `user_roles`:

```typescript
const { data: userRole } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .in('role', ['admin', 'owner'])
  .maybeSingle();

if (!userRole) {
  return new Response(
    JSON.stringify({ error: 'Insufficient permissions' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### Шаг 3: Обновить проверку прав

Заменить:
```typescript
if (!['admin', 'owner'].includes(profile.role || '')) {
```

На проверку через `user_roles`:
```typescript
if (!userRole) {
```

---

## Файлы для изменения

| Файл | Изменения |
|------|-----------|
| `supabase/functions/onlinepbx-settings/index.ts` | Убрать `role` из запроса к profiles, добавить запрос к user_roles |

---

## Изменения в коде

Было (строки 88-107):
```typescript
// Get user's organization
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('organization_id, role')
  .eq('id', user.id)
  .single();

if (profileError || !profile?.organization_id) {
  return new Response(
    JSON.stringify({ error: 'User profile not found' }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Only admins and owners can manage settings
if (!['admin', 'owner'].includes(profile.role || '')) {
  return new Response(
    JSON.stringify({ error: 'Insufficient permissions' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

Станет:
```typescript
// Get user's organization
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('organization_id')
  .eq('id', user.id)
  .single();

if (profileError || !profile?.organization_id) {
  return new Response(
    JSON.stringify({ error: 'User profile not found' }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Check if user is admin or owner
const { data: userRole } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .in('role', ['admin', 'owner'])
  .maybeSingle();

if (!userRole) {
  return new Response(
    JSON.stringify({ error: 'Insufficient permissions' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

---

## После исправления

После развёртывания обновлённой Edge Function:
1. Настройки OnlinePBX будут корректно загружаться и сохраняться
2. Webhook URL будет генерироваться и отображаться в панели
3. Интеграция с OnlinePBX заработает
